// ==========================================================
// VÍ TIỀN (VND WALLET) - Số dư & phí theo từng Discord User ID
// - Mỗi user được tặng 100.000 ₫ khi đăng nhập Discord lần đầu.
// - Mỗi request /v1/* bị trừ phí CỐ ĐỊNH theo model (₫ / lượt).
// - Hết tiền -> trả về HTTP 402 (Payment Required).
// Persistence: Supabase (nếu có) + fallback bộ nhớ trong api/_supabase.js
// ==========================================================
import {
  dbGetUserBalanceVnd,
  dbDebitUserBalanceVnd,
  dbTopUpUserBalanceVnd,
  dbInsertWalletTransaction,
  dbGetUserTransactions,
} from './_supabase.js';

// Số dư tặng khi user đăng nhập Discord lần đầu (Việt Nam Đồng)
export const DEFAULT_USER_BALANCE_VND = Number(
  process.env.DEFAULT_USER_BALANCE_VND || 100000
);

// Phí cố định cho mỗi request theo model (₫ / lượt)
export const MODEL_REQUEST_FEE_VND = {
  'auto': 1000,
  'glm-5.3': 1000,
  'longcat-2.5': 500,
  'sensenova-6.8-flash-lite': 500,
};

// Phí mặc định cho các endpoint khác (embeddings, audio, ...)
export const DEFAULT_REQUEST_FEE_VND = 1000;

// Format số tiền theo chuẩn Việt Nam: 100000 -> "100.000 ₫"
export function formatVnd(amount) {
  const num = Math.round(Number(amount) || 0);
  return `${num.toLocaleString('vi-VN')} ₫`;
}

// Lấy phí cố định (₫) của 1 request theo model
export function getRequestFeeVnd(model = '') {
  const fee = MODEL_REQUEST_FEE_VND[model];
  return Number.isFinite(fee) && fee > 0 ? fee : DEFAULT_REQUEST_FEE_VND;
}

// Trừ phí 1 request. Trả về { success, feeVnd, balanceVnd, code, error }
export async function chargeUserForRequest(discordUserId, model = '') {
  const uid = String(discordUserId || '').trim();
  if (!uid) {
    // Key cấp cho admin/master (CUSTOM_ACCESS_KEY) không gắn với user -> không trừ tiền
    return { success: false, skipped: true, error: 'missing_user_id' };
  }

  const feeVnd = getRequestFeeVnd(model);
  const current = await dbGetUserBalanceVnd(uid);

  if (current < feeVnd) {
    return {
      success: false,
      code: 'insufficient_balance',
      feeVnd,
      balanceVnd: current,
      error:
        `Số dư không đủ để thực hiện yêu cầu này. ` +
        `Model "${model || 'auto'}" có phí ${formatVnd(feeVnd)}/lượt, số dư hiện tại của bạn là ${formatVnd(current)}. ` +
        `Vui lòng liên hệ Admin để nạp thêm tiền vào ví.`,
    };
  }

  const debited = await dbDebitUserBalanceVnd(uid, feeVnd);
  if (!debited.ok) {
    const insufficient = debited.error === 'insufficient_balance';
    return {
      success: false,
      code: insufficient ? 'insufficient_balance' : 'debit_failed',
      feeVnd,
      balanceVnd: debited.balanceVnd,
      error: insufficient
        ? `Số dư không đủ để thực hiện yêu cầu này (cần ${formatVnd(feeVnd)}/lượt). Vui lòng liên hệ Admin để nạp thêm tiền vào ví.`
        : 'Không thể trừ phí ví, vui lòng thử lại sau.',
    };
  }

  await dbInsertWalletTransaction(uid, {
    type: 'debit',
    amountVnd: feeVnd,
    balanceAfterVnd: debited.balanceVnd,
    model: model || 'auto',
    note: `Gọi API: ${model || 'auto'}`,
  });

  return {
    success: true,
    feeVnd,
    balanceVnd: debited.balanceVnd,
  };
}

// Nạp tiền vào ví cho 1 Discord User ID (do Admin thực hiện)
export async function topUpUserBalance(discordUserId, amountVnd, note = 'Admin nạp tiền vào ví') {
  const uid = String(discordUserId || '').trim();
  const amount = Math.floor(Number(amountVnd) || 0);

  if (!uid) return { success: false, error: 'Thiếu Discord User ID.' };
  if (amount <= 0) return { success: false, error: 'Số tiền nạp không hợp lệ (phải > 0).' };

  const result = await dbTopUpUserBalanceVnd(uid, amount);
  if (!result.ok) {
    return { success: false, error: result.error || 'Không thể nạp tiền vào ví.' };
  }

  await dbInsertWalletTransaction(uid, {
    type: 'topup',
    amountVnd: amount,
    balanceAfterVnd: result.balanceVnd,
    model: '',
    note,
  });

  return {
    success: true,
    discordUserId: uid,
    amountVnd: amount,
    balanceVnd: result.balanceVnd,
  };
}

// Lấy thông tin ví: số dư + lịch sử giao dịch gần nhất
export async function getWalletInfo(discordUserId) {
  const uid = String(discordUserId || '').trim();
  if (!uid) return { balanceVnd: 0, transactions: [] };

  const [balanceVnd, transactions] = await Promise.all([
    dbGetUserBalanceVnd(uid),
    dbGetUserTransactions(uid, 50),
  ]);

  return { balanceVnd, transactions };
}
