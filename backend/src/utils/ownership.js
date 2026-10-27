export const ownedWhere = (user, where = {}) => ({
  ...where,
  ownerUserId: user.id,
});
export const ownerData = (user) => ({ ownerUserId: user.id });
