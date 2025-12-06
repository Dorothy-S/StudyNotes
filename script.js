// -----------------------------
// CHECK LOGIN STATUS FOR NAVBAR
// -----------------------------
async function checkLoginStatus() {
    try {
        const res = await fetch("/api/auth/status", {
            credentials: "include"
        });

        const data = await res.json();

        const loginLink = document.getElementById("loginLink");
        const registerLink = document.getElementById("registerLink");
        const logoutLink = document.getElementById("logoutLink");

        // Nav links for Dashboard / Create
        const dashboardNav = document.querySelector('nav a[href="index.html"]');
        const createNav = document.querySelector('nav a[href="create.html"]');
        const heroCreateBtn = document.querySelector(".dashboard-btn");

        const page = window.location.pathname.split("/").pop();
        const protectedPages = ["", "index.html", "create.html", "edit.html"];

        if (data.loggedIn) {
            // Hide login/register
            if (loginLink) loginLink.style.display = "none";
            if (registerLink) registerLink.style.display = "none";

            // Show logout
            if (logoutLink) logoutLink.style.display = "inline-block";

            // Show dashboard/create links + hero button
            if (dashboardNav) dashboardNav.style.display = "inline-block";
            if (createNav) createNav.style.display = "inline-block";
            if (heroCreateBtn) heroCreateBtn.style.display = "inline-block";

            // Logout click handler
            if (logoutLink) {
                logoutLink.onclick = async (e) => {
                    e.preventDefault();
                    await fetch("/api/auth/logout", {
                        credentials: "include"
                    });
                    window.location.href = "login.html";
                };
            }

            // ----- NEW: Fill account info on dashboard -----
            if (page === "" || page === "index.html") {
                const avatar = document.getElementById("accountAvatar");
                const nameEl = document.getElementById("accountUsername");
                const emailEl = document.getElementById("accountEmail");

                if (data.user) {
                    if (nameEl) {
                        nameEl.textContent = data.user.username || "";
                    }
                    if (emailEl) {
                        emailEl.textContent = data.user.email || "";
                    }
                    if (avatar) {
                        if (data.user.profilePic) {
                            avatar.src = data.user.profilePic;
                        } else {
                            avatar.src = "image.png"; // default logo as avatar
                        }
                    }
                }
            }

        } else {
            // Not logged in: show login/register
            if (loginLink) loginLink.style.display = "inline-block";
            if (registerLink) registerLink.style.display = "inline-block";
            if (logoutLink) logoutLink.style.display = "none";

            // Hide dashboard/create + hero button
            if (dashboardNav) dashboardNav.style.display = "none";
            if (createNav) createNav.style.display = "none";
            if (heroCreateBtn) heroCreateBtn.style.display = "none";

            // If they are on a protected page, send to login
            if (protectedPages.includes(page)) {
                window.location.href = "login.html";
            }
        }

    } catch (err) {
        console.error("Error checking login status:", err);
    }
}

checkLoginStatus();

// -----------------------------
// NOTES MANAGER (USES SESSION)
// -----------------------------
class NotesManager {
    constructor() {
        // API base (same origin as server.js)
        this.apiBase = "/api/notes";
        this.init();
    }

    // Decide which page we are on
    init() {
        const page = window.location.pathname.split("/").pop();

        if (page === "" || page === "index.html") {
            this.loadNotes();
        } else if (page === "create.html") {
            this.handleCreateForm();
        } else if (page === "edit.html") {
            this.handleEditForm();
        }
    }

    // Clean text for HTML
    clean(text) {
        const div = document.createElement("div");
        div.textContent = text ?? "";
        return div.innerHTML;
    }

    // Helper: if unauthorized, go to login
    async handleAuthFetch(url, options = {}) {
        const res = await fetch(url, {
            credentials: "include",
            ...options
        });

        if (res.status === 401) {
            // session expired / not logged in
            window.location.href = "login.html";
            return null;
        }

        return res;
    }

    // -------------------------
    // LOAD NOTES (GET /notes)
    // -------------------------
    async loadNotes() {
        const body = document.getElementById("notesTableBody");
        const empty = document.getElementById("emptyMessage");

        if (!body || !empty) return;

        try {
            const res = await this.handleAuthFetch(this.apiBase);
            if (!res) return; // redirected

            const notes = await res.json();

            if (!notes || notes.length === 0) {
                empty.style.display = "block";
                body.innerHTML = "";
                return;
            }

            empty.style.display = "none";

            body.innerHTML = notes.map(n => `
                <tr>
                    <td>${this.clean(n.title)}</td>
                    <td>${this.clean(n.course)}</td>
                    <td>${this.clean((n.content || "").substring(0, 50))}${(n.content || "").length > 50 ? "..." : ""}</td>
                    <td>${n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}</td>
                    <td>
                        <a href="edit.html?id=${n._id}" class="btn-edit">Edit</a>
                        <button class="btn-delete" onclick="notesManager.deleteNote('${n._id}')">Delete</button>
                    </td>
                </tr>
            `).join("");

        } catch (err) {
            console.error("Error loading notes:", err);
        }
    }

    // -------------------------
    // CREATE NOTE (POST /notes)
    // -------------------------
    handleCreateForm() {
        const form = document.getElementById("noteForm");
        if (!form) return;

        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const title = document.getElementById("noteTitle").value.trim();
            const course = document.getElementById("noteCourse").value.trim();
            const content = document.getElementById("noteContent").value.trim();

            if (!title || !course || !content) return;

            try {
                const res = await this.handleAuthFetch(this.apiBase, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title, course, content })
                });

                if (!res) return; // maybe redirected

                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    console.error("Error creating note:", data);
                    alert("Could not create note.");
                    return;
                }

                // Go back to dashboard
                window.location.href = "index.html";
            } catch (err) {
                console.error("Error creating note:", err);
            }
        });
    }

    // -------------------------
    // EDIT NOTE (GET + PUT /notes/:id)
    // -------------------------
    async handleEditForm() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("id");

        if (!id) {
            window.location.href = "index.html";
            return;
        }

        try {
            // Load existing note
            const res = await this.handleAuthFetch(`${this.apiBase}/${id}`);
            if (!res) return; // redirected

            const note = await res.json();

            // Fill form
            document.getElementById("editNoteTitle").value = note.title || "";
            document.getElementById("editNoteCourse").value = note.course || "";
            document.getElementById("editNoteContent").value = note.content || "";

            const form = document.getElementById("editNoteForm");
            form.addEventListener("submit", async (e) => {
                e.preventDefault();

                const title = document.getElementById("editNoteTitle").value.trim();
                const course = document.getElementById("editNoteCourse").value.trim();
                const content = document.getElementById("editNoteContent").value.trim();

                if (!title || !course || !content) return;

                const updateRes = await this.handleAuthFetch(`${this.apiBase}/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title, course, content })
                });

                if (!updateRes) return;

                if (!updateRes.ok) {
                    const data = await updateRes.json().catch(() => ({}));
                    console.error("Error updating note:", data);
                    alert("Could not update note.");
                    return;
                }

                window.location.href = "index.html";
            });

        } catch (err) {
            console.error("Error loading note for edit:", err);
            window.location.href = "index.html";
        }
    }

    // -------------------------
    // DELETE NOTE (DELETE /notes/:id)
    // -------------------------
    async deleteNote(id) {
        try {
            const res = await this.handleAuthFetch(`${this.apiBase}/${id}`, {
                method: "DELETE"
            });

            if (!res) return;

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                console.error("Error deleting note:", data);
                alert("Could not delete note.");
                return;
            }

            this.loadNotes();
        } catch (err) {
            console.error("Error deleting note:", err);
        }
    }
}

// Global instance used by HTML onclick
const notesManager = new NotesManager();

// -----------------------------
// REGISTER USER
// -----------------------------
const registerBtn = document.getElementById("registerBtn");
if (registerBtn) {
    registerBtn.addEventListener("click", async () => {
        const username = document.getElementById("regUsername").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value.trim();

        if (!username || !email || !password) {
            alert("Please fill all fields");
            return;
        }

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password }),
                credentials: "include"
            });

            const data = await res.json();
            alert(data.message);

            if (res.ok) {
                window.location.href = "login.html";
            }
        } catch (err) {
            console.error("Register error:", err);
        }
    });
}

// -----------------------------
// LOGIN USER
// -----------------------------
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
        const username = document.getElementById("loginUsername").value.trim();
        const password = document.getElementById("loginPassword").value.trim();

        if (!username || !password) {
            alert("Please fill all fields");
            return;
        }

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
                credentials: "include"
            });

            const data = await res.json();
            alert(data.message);

            if (res.ok) {
                window.location.href = "index.html";
            }
        } catch (err) {
            console.error("Login error:", err);
        }
    });
}

// -----------------------------
// PROFILE PICTURE UPLOAD (ACCOUNT SECTION)
// -----------------------------
const profilePicForm = document.getElementById("profilePicForm");
if (profilePicForm) {
    profilePicForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const fileInput = document.getElementById("profilePicInput");
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            alert("Please choose an image file first.");
            return;
        }

        const formData = new FormData();
        formData.append("profilePic", fileInput.files[0]);

        try {
            const res = await fetch("/api/auth/profile-picture", {
                method: "POST",
                credentials: "include",
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.message || "Could not update profile picture.");
                return;
            }

            alert(data.message || "Profile picture updated.");

            const avatar = document.getElementById("accountAvatar");
            if (avatar && data.profilePicUrl) {
                avatar.src = data.profilePicUrl;
            }
        } catch (err) {
            console.error("Profile picture upload error:", err);
        }
    });
}

// -----------------------------
// CHANGE PASSWORD (ACCOUNT SECTION)
// -----------------------------
const changePasswordForm = document.getElementById("changePasswordForm");
if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const oldPassword = document.getElementById("oldPassword").value.trim();
        const newPassword = document.getElementById("newPassword").value.trim();

        if (!oldPassword || !newPassword) {
            alert("Please fill in both password fields.");
            return;
        }

        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ oldPassword, newPassword })
            });

            const data = await res.json();
            alert(data.message || "Password change request finished.");

            if (res.ok) {
                changePasswordForm.reset();
            }
        } catch (err) {
            console.error("Change password error:", err);
        }
    });
}
