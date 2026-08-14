import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
  auth,
  db
} from "./firebase.js";

import {
  seedMenuIfEmpty,
  subscribeToMenu
} from "./menu-data.js";


const ADMIN_EMAIL = "arindia.in@gmail.com";

const loginPanel =
  document.getElementById("login-panel");

const dashboard =
  document.getElementById("dashboard");

const loginForm =
  document.getElementById("login-form");

const loginMessage =
  document.getElementById("login-message");

const adminMessage =
  document.getElementById("admin-message");

const menuRoot =
  document.getElementById("admin-menu");

const seedButton =
  document.getElementById("seed-btn");

const logoutButton =
  document.getElementById("logout-btn");

let unsubscribeMenu = null;


function setLoginMessage(
  text,
  type = "error"
) {
  loginMessage.textContent = text;
  loginMessage.className =
    `form-message ${type}`;
}


function showAdminMessage(
  text,
  type = "info"
) {
  adminMessage.hidden = false;
  adminMessage.textContent = text;
  adminMessage.className =
    `admin-alert ${type}`;

  window.clearTimeout(
    showAdminMessage.timer
  );

  showAdminMessage.timer =
    window.setTimeout(() => {
      adminMessage.hidden = true;
    }, 4500);
}


function setView(loggedIn) {
  loginPanel.hidden = loggedIn;
  dashboard.hidden = !loggedIn;
}


async function getAuthorizedProfile(user) {

  const profileRef =
    doc(db, "users", user.uid);

  const profileSnap =
    await getDoc(profileRef);

  if (!profileSnap.exists()) {
    return null;
  }

  const profile =
    profileSnap.data();

  if (profile.active !== true) {
    return null;
  }

  if (
    !["admin", "menu_manager"]
      .includes(profile.role)
  ) {
    return null;
  }

  return profile;
}


function renderAdminMenu(items) {

  if (!items.length) {

    menuRoot.innerHTML = `
      <div class="admin-empty">
        <strong>
          No menu records yet.
        </strong>

        <span>
          Use “Initialize Menu”
          to create the current menu.
        </span>
      </div>
    `;

    seedButton.hidden = false;

    return;
  }

  seedButton.hidden = true;

  const groups = [
    "Main Course",
    "Raita",
    "Roti",
    "Drinks"
  ];

  menuRoot.innerHTML =
    groups
      .map(category => {

        const categoryItems =
          items.filter(
            item =>
              item.category === category
          );

        if (!categoryItems.length) {
          return "";
        }

        return `
          <section class="admin-category">

            <div class="admin-category-title">
              <h2>${category}</h2>
              <span>
                ${categoryItems.length} items
              </span>
            </div>

            ${categoryItems
              .map(item => `

                <article
                  class="admin-item ${
                    item.available === false
                      ? "is-off"
                      : ""
                  }"
                  data-item-id="${item.id}"
                >

                  <div class="item-info">

                    <strong>
                      ${item.name}
                    </strong>

                    <span>
                      ${item.category}
                      ·
                      ₹${Number(
                        item.price
                      ).toLocaleString("en-IN")}
                    </span>

                  </div>

                  <div class="availability-control">

                    <span class="status-text">
                      ${
                        item.available === false
                          ? "Currently Unavailable"
                          : "Available"
                      }
                    </span>

                    <label class="switch">

                      <input
                        type="checkbox"
                        ${
                          item.available !== false
                            ? "checked"
                            : ""
                        }
                        data-availability="${item.id}"
                      >

                      <span class="slider"></span>

                    </label>

                  </div>

                </article>

              `)
              .join("")}

          </section>
        `;
      })
      .join("");


  menuRoot
    .querySelectorAll(
      "input[data-availability]"
    )
    .forEach(input => {

      input.addEventListener(
        "change",
        async () => {

          const id =
            input.dataset.availability;

          const itemCard =
            input.closest(".admin-item");

          const status =
            itemCard.querySelector(
              ".status-text"
            );

          input.disabled = true;

          try {

            await updateDoc(
              doc(db, "menu", id),
              {
                available:
                  input.checked
              }
            );

            itemCard.classList.toggle(
              "is-off",
              !input.checked
            );

            status.textContent =
              input.checked
                ? "Available"
                : "Currently Unavailable";

            showAdminMessage(
              `${
                itemCard.querySelector(
                  "strong"
                ).textContent
              } is now ${
                input.checked
                  ? "available"
                  : "unavailable"
              }.`,
              "success"
            );

          } catch (error) {

            input.checked =
              !input.checked;

            showAdminMessage(
              "Could not update this item. Please try again.",
              "error"
            );

            console.error(error);

          } finally {

            input.disabled = false;

          }

        }
      );

    });
}


loginForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    setLoginMessage(
      "Signing in…",
      "info"
    );

    const email =
      document
        .getElementById("email")
        .value
        .trim();

    const password =
      document
        .getElementById("password")
        .value;

    try {

      const credential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const profile =
        await getAuthorizedProfile(
          credential.user
        );

      if (!profile) {

        await signOut(auth);

        throw new Error(
          "NOT_AUTHORIZED"
        );
      }

    } catch (error) {

      const message =
        error.message ===
        "NOT_AUTHORIZED"

          ? "This account is not permitted to access the management panel."

          : "Sign in failed. Check your email and password.";

      setLoginMessage(
        message,
        "error"
      );

    }
  }
);


logoutButton.addEventListener(
  "click",
  async () => {
    await signOut(auth);
  }
);


seedButton.addEventListener(
  "click",
  async () => {

    seedButton.disabled = true;

    seedButton.textContent =
      "Initializing…";

    try {

      const result =
        await seedMenuIfEmpty();

      showAdminMessage(
        result.created
          ? `Created ${result.count} menu items.`
          : `Menu already contains ${result.count} items.`,
        "success"
      );

    } catch (error) {

      showAdminMessage(
        "Could not initialize the menu. Check Firestore rules and try again.",
        "error"
      );

      console.error(error);

    } finally {

      seedButton.disabled = false;

      seedButton.textContent =
        "Initialize Menu";

    }
  }
);


onAuthStateChanged(
  auth,
  async user => {

    if (!user) {

      if (unsubscribeMenu) {
        unsubscribeMenu();
      }

      unsubscribeMenu = null;

      setView(false);

      return;
    }

    try {

      const profile =
        await getAuthorizedProfile(user);

      if (!profile) {

        await signOut(auth);

        setLoginMessage(
          "This account is not permitted to access the management panel.",
          "error"
        );

        return;
      }

      document.getElementById(
        "user-email"
      ).textContent =
        user.email || ADMIN_EMAIL;

      document.getElementById(
        "user-role"
      ).textContent =
        profile.role;

      setView(true);

      if (unsubscribeMenu) {
        unsubscribeMenu();
      }

      unsubscribeMenu =
        subscribeToMenu(
          renderAdminMenu,
          error => {

            console.error(error);

            showAdminMessage(
              "Unable to load the menu from Firestore.",
              "error"
            );

          }
        );

    } catch (error) {

      console.error(error);

      await signOut(auth);

      setLoginMessage(
        "Unable to verify your management access.",
        "error"
      );

    }

  }
);