export const OTP_LIFETIME_SECONDS = 300;
export const RESEND_COOLDOWN_SECONDS = 60;
export const normalizeOtp = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(0, 6);
export const nextCountdown = (seconds) => Math.max(0, Number(seconds || 0) - 1);
export const sortRoles = (roles = []) =>
  [...roles].sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code));
export const isNoActiveRoleError = (error) =>
  error?.response?.status === 403 &&
  /no active role/i.test(
    error?.response?.data?.message || error?.message || "",
  );
export function loginStageFromResponse(data) {
  if (data?.nextStep === "OTP_REQUIRED" && data.challengeId)
    return { stage: "OTP", challengeId: data.challengeId };
  if (data?.nextStep === "ROLE_SELECTION_REQUIRED" && data.selectionProof)
    return { stage: "ROLE", selection: data };
  return { stage: "ERROR" };
}
export const resendOtpState = (challengeId) => ({
  challengeId,
  otp: "",
  expiresIn: OTP_LIFETIME_SECONDS,
  resendIn: RESEND_COOLDOWN_SECONDS,
});
export const selectRoleState = (success) =>
  success
    ? { stage: "AUTHENTICATED", error: "" }
    : {
        stage: "ROLE",
        error: "Your sign-in session has expired. Please sign in again.",
      };
export const switchRoleState = (event) =>
  ({
    start: { loading: true, error: "" },
    success: { loading: false, error: "", invalidated: true },
    failure: {
      loading: false,
      error: "Unable to switch role.",
      invalidated: false,
    },
  })[event];
