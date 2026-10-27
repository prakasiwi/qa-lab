import { Prisma } from "@prisma/client";

export const errorMiddleware = (err, req, res, next) => {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    const target = Array.isArray(err.meta?.target) ? err.meta.target : [];
    if (target.includes("email")) {
      return res
        .status(409)
        .json({ success: false, message: "Email customer sudah digunakan" });
    }
    if (target.includes("customerCode")) {
      return res
        .status(409)
        .json({ success: false, message: "Customer Code sudah digunakan" });
    }
    return res.status(409).json({ success: false, message: "Data duplicate" });
  }
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2003"
  ) {
    return res
      .status(409)
      .json({
        success: false,
        message:
          "Data tidak dapat dihapus karena masih digunakan oleh data lain",
      });
  }
  const statusCode = err.statusCode || 500;
  const isInternalError = statusCode >= 500;
  if (isInternalError) {
    console.error(
      JSON.stringify({
        event: "UNEXPECTED_REQUEST_ERROR",
        errorName: err?.name || "Error",
        errorCode: err?.code || null,
      }),
    );
  }
  const body = {
    success: false,
    message: isInternalError
      ? "Internal server error"
      : err.message || "Permintaan gagal",
  };
  if (!isInternalError && err.errors) body.errors = err.errors;
  return res.status(statusCode).json(body);
};
