export function createAuthSession(profileRequest) {
  let state = {
    loading: true,
    authenticated: false,
    user: null,
    access: null,
    generation: 0,
  };
  let restoration;
  let hasRestored = false;
  let epoch = 0;
  const listeners = new Set();
  const emit = (next) => {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
  };
  const invalidateRoleData = () => {
    const generation = state.generation + 1;
    emit({ generation });
    if (typeof window !== "undefined")
      window.dispatchEvent(
        new CustomEvent("auth:role-switched", { detail: { generation } }),
      );
  };
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async restore({ force = false } = {}) {
      if (restoration && !force) return restoration.promise;
      if (hasRestored && !force) return state.authenticated ? state.user : null;
      const restorationEpoch = ++epoch;
      emit({ loading: true });
      const promise = profileRequest()
        .then(({ data }) => {
          if (restorationEpoch !== epoch) return null;
          const user = data.data;
          hasRestored = true;
          emit({
            loading: false,
            authenticated: true,
            user,
            access: user?.accessRole || null,
          });
          return user;
        })
        .catch(() => {
          if (restorationEpoch !== epoch) return null;
          hasRestored = true;
          emit({
            loading: false,
            authenticated: false,
            user: null,
            access: null,
          });
          return null;
        });
      restoration = { epoch: restorationEpoch, promise };
      promise.finally(() => {
        if (restoration?.epoch === restorationEpoch) restoration = null;
      });
      return promise;
    },
    async establish({ roleSwitch = false } = {}) {
      if (roleSwitch) invalidateRoleData();
      return this.restore({ force: true });
    },
    clear() {
      epoch += 1;
      restoration = null;
      const isAlreadyAnonymous =
        !state.loading &&
        !state.authenticated &&
        state.user === null &&
        state.access === null;
      if (!isAlreadyAnonymous)
        emit({
          loading: false,
          authenticated: false,
          user: null,
          access: null,
        });
    },
  };
}
