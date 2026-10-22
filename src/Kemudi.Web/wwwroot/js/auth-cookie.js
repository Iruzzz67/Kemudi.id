window.kemudiAuth = {
    setToken: async function (token) {
        const response = await fetch("/auth/session", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: token })
        });

        if (!response.ok) {
            throw new Error("Sesi gagal disimpan.");
        }
    },
    clearToken: async function () {
        const response = await fetch("/auth/session", {
            method: "DELETE",
            credentials: "same-origin"
        });

        if (!response.ok) {
            throw new Error("Sesi gagal dihapus.");
        }
    }
};
