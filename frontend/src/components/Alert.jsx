export function Alert({ msg, type = 'error' }) {
  if (!msg) return null;

  const classNameByType = {
    success: 'alert alert-success',
    warning: 'alert alert-warning',
    info: 'alert alert-info',
    error: 'alert alert-error',
  };

  return <div className={classNameByType[type] || classNameByType.error}>{msg}</div>;
}
