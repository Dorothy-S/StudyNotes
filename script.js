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

        const dashboardNav = document.querySelector('nav a[href="index.html"]');
        const createNav = document.querySelector('nav a[href="create.html"]');
        const heroCreateBtn = document.querySelector(".dashboard-btn");

        const page = window.location.pathname.split("/").pop();
        const protectedPages = ["", "index.html", "create.html", "edit.html"];

        if (data.loggedIn) {
            if (loginLink) loginLink.style.display = "none";
            if (registerLink) registerLink.style.display = "none";
            if (logoutLink) logoutLink.style.display = "inline-block";

            if (dashboardNav) dashboardNav.style.display = "inline-block";
            if (createNav) createNav.style.display = "inline-block";
            if (heroCreateBtn) heroCreateBtn.style.display = "inline-block";

            if (logoutLink) {
                logoutLink.onclick = async (e) => {
                    e.preventDefault();
                    await fetch("/api/auth/logout", {
                        credentials: "include"
                    });
                    window.location.href = "login.html";
                };
            }

            // Fill account widgets
            if (page === "" || page === "index.html") {
                const avatar = document.getElementById("accountAvatar");
                const nameEl = document.getElementById("accountUsername");
                const emailEl = document.getElementById("accountEmail");

                if (data.user) {
                    if (nameEl) nameEl.textContent = data.user.username;
                    if (emailEl) emailEl.textContent = data.user.email;
                    if (avatar) {
                        avatar.src = data.user.profilePic || "image.png";
                    }
                }
            }
        } else {
            if (loginLink) loginLink.style.display = "inline-block";
            if (registerLink) registerLink.style.display = "inline-block";
            if (logoutLink) logoutLink.style.display = "none";

            if (dashboardNav) dashboardNav.style.display = "none";
            if (createNav) createNav.style.display = "none";
            if (heroCreateBtn) heroCreateBtn.style.display = "none";

            if (protectedPages.includes(page)) {
                window.location.href = "login.html";
            }
        }

    } catch (err) {
        console.error("Error checking login status:", err);
    }
}

checkLoginStatus();


// =====================================================
// NOTES MANAGER — uses session authentication
// =====================================================
class NotesManager {
    constructor() {
        this.apiBase = "/api/notes";
        this.init();
    }

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

    clean(text) {
        const div = document.createElement("div");
        div.textContent = text || "";
        return div.innerHTML;
    }

    async handleAuthFetch(url, options = {}) {
        const res = await fetch(url, {
            credentials: "include",
            ...options
        });

        if (res.status === 401) {
            window.location.href = "login.html";
            return null;
        }
        return res;
    }

    // -------------------------
    // LOAD NOTES
    // -------------------------
    async loadNotes() {
        const body = document.getElementById("notesTableBody");
        const empty = document.getElementById("emptyMessage");

        if (!body || !empty) return;

        try {
            const res = await this.handleAuthFetch(this.apiBase);
            if (!res) return;

            const notes = await res.json();

            if (!notes.length) {
                empty.style.display = "block";
                body.innerHTML = "";
                return;
            }

            empty.style.display = "none";

            body.innerHTML = notes.map(n => `
                <tr>
                    <td>${this.clean(n.title)}</td>
                    <td>${this.clean(n.course)}</td>
                    <td>${this.clean(n.content.substring(0, 50))}${n.content.length > 50 ? "..." : ""}</td>
                    <td>${new Date(n.createdAt).toLocaleDateString()}</td>
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
    // CREATE NOTE
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

            const res = await this.handleAuthFetch(this.apiBase, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ title, course, content })
            });

            if (res?.ok) window.location.href = "index.html";
            else alert("Could not create note.");
        });
    }

    // -------------------------
    // EDIT NOTE
    // -------------------------
    async handleEditForm() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("id");
        if (!id) return (window.location.href = "index.html");

        const res = await this.handleAuthFetch(`${this.apiBase}/${id}`);
        if (!res) return;

        const note = await res.json();

        document.getElementById("editNoteTitle").value = note.title;
        document.getElementById("editNoteCourse").value = note.course;
        document.getElementById("editNoteContent").value = note.content;

        const form = document.getElementById("editNoteForm");

        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const title = document.getElementById("editNoteTitle").value.trim();
            const course = document.getElementById("editNoteCourse").value.trim();
            const content = document.getElementById("editNoteContent").value.trim();

            const update = await this.handleAuthFetch(`${this.apiBase}/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ title, course, content })
            });

            if (update?.ok) window.location.href = "index.html";
            else alert("Could not update note.");
        });
    }

    // -------------------------
    // DELETE NOTE
    // -------------------------
    async deleteNote(id) {
        const res = await this.handleAuthFetch(`${this.apiBase}/${id}`, {
            method: "DELETE"
        });

        if (res?.ok) this.loadNotes();
        else alert("Could not delete note.");
    }
}

const notesManager = new NotesManager();


// ========================================
// REGISTER
// ========================================
const registerBtn = document.getElementById("registerBtn");
if (registerBtn) {
    registerBtn.onclick = async () => {
        const username = document.getElementById("regUsername").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value.trim();

        if (!username || !email || !password) {
            alert("Please fill all fields");
            return;
        }

        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();
        alert(data.message);

        if (res.ok) window.location.href = "login.html";
    };
}


// ========================================
// LOGIN (LOCAL)
// ========================================
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
    loginBtn.onclick = async () => {
        const username = document.getElementById("loginUsername").value.trim();
        const password = document.getElementById("loginPassword").value.trim();

        if (!username || !password) {
            alert("Please fill all fields");
            return;
        }

        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        alert(data.message);

        if (res.ok) window.location.href = "index.html";
    };
}


// ========================================
// PROFILE PICTURE UPLOAD
// ========================================
const profilePicForm = document.getElementById("profilePicForm");
if (profilePicForm) {
    profilePicForm.onsubmit = async (e) => {
        e.preventDefault();

        const fileInput = document.getElementById("profilePicInput");
        if (!fileInput.files.length) {
            alert("Choose an image first.");
            return;
        }

        const formData = new FormData();
        formData.append("profilePic", fileInput.files[0]);

        const res = await fetch("/api/auth/profile-picture", {
            method: "POST",
            credentials: "include",
            body: formData
        });

        const data = await res.json();
        alert(data.message);

        if (res.ok) {
            const avatar = document.getElementById("accountAvatar");
            if (avatar) avatar.src = data.profilePicUrl;
        }
    };
}


// ========================================
// CHANGE PASSWORD
// ========================================
const changePasswordForm = document.getElementById("changePasswordForm");
if (changePasswordForm) {
    changePasswordForm.onsubmit = async (e) => {
        e.preventDefault();

        const oldPassword = document.getElementById("oldPassword").value.trim();
        const newPassword = document.getElementById("newPassword").value.trim();

        if (!oldPassword || !newPassword) {
            alert("Fill both fields.");
            return;
        }

        const res = await fetch("/api/auth/change-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ oldPassword, newPassword })
        });

        const data = await res.json();
        alert(data.message);

        if (res.ok) changePasswordForm.reset();
    };
}
