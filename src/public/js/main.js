  (function checkAuth() {
    const token = localStorage.getItem("token");

    // ❌ Not logged in → redirect to login
    if (!token) {
      window.location.href = "/";
      return;
    }

    try {
      // Optional: validate token structure
      const payload = JSON.parse(atob(token.split(".")[1]));
    } catch (e) {
      // ❌ Invalid/expired token
      localStorage.clear();
      window.location.href = "/";
    }
  })();
