const RMDUAuth = {
  handleRegisterSubmit: async function (event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    try {
      const response = await fetch("backend/register.php", {
        method: "POST",
        body: formData
      });

      const result = await response.json();
      if (result.status === "success") {
        alert("Account created! Redirecting to login...");
        window.location.href = "login.html";
      } else {
        alert("Error: " + result.message);
      }
    } catch (error) {
      alert("An error occurred during registration.");
      console.error(error);
    }
  },

  handleLoginSubmit: async function (event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    try {
      const response = await fetch("backend/login_handler.php", {
        method: "POST",
        body: formData
      });

      const result = await response.json();
      if (result.status === "success") {
        // Show popup with username (assumes backend sends result.username)
        alert("User login successful! Welcome, " + result.username);
        // Redirect to index.html
        window.location.href = "index.html";
      } else {
        alert("Login failed: " + result.message);
      }
    } catch (error) {
      alert("An error occurred during login.");
      console.error(error);
    }
  },

  checkAuth: async function () {
    try {
      const response = await fetch("backend/auth_api.php?action=check");
      const result = await response.json();
      return result.authenticated ? result.user : null;
    } catch (error) {
      console.error("Auth check error:", error);
      return null;
    }
  },

  logout: async function () {
    try {
      const response = await fetch("backend/auth_api.php?action=logout", {
        method: "POST"
      });
      const result = await response.json();
      if (result.status === "success") {
        window.location.href = "index.html";
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  }
};
