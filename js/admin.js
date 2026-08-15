import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection
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

const forgotPasswordButton =
  document.getElementById("forgot-password-btn");

const adminMessage =
  document.getElementById("admin-message");

const menuRoot =
  document.getElementById("admin-menu");

const seedButton =
  document.getElementById("seed-btn");

const logoutButton =
  document.getElementById("logout-btn");


/* Modal */

const itemModal =
  document.getElementById("item-modal");

const itemForm =
  document.getElementById("item-form");

const modalTitle =
  document.getElementById("modal-title");

const modalClose =
  document.getElementById("modal-close");

const modalCancel =
  document.getElementById("modal-cancel");

const modalSave =
  document.getElementById("modal-save");

const itemNameInput =
  document.getElementById("item-name");

const itemPriceInput =
  document.getElementById("item-price");

const itemCategoryInput =
  document.getElementById("item-category");


let unsubscribeMenu = null;

let editingItemId = null;


/* =========================================================
   HELPERS
   ========================================================= */

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


function money(value) {

  return `₹${Number(value || 0).toLocaleString("en-IN")}`;

}


function createId() {

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {

    return crypto.randomUUID();

  }

  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );

}


/* =========================================================
   AUTHORIZATION
   ========================================================= */

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


/* =========================================================
   MODAL
   ========================================================= */

function openAddModal(category) {

  editingItemId = null;

  modalTitle.textContent =
    "Add Menu Item";

  modalSave.textContent =
    "Add Item";

  itemForm.reset();

  itemCategoryInput.value =
    category;

  itemCategoryInput.disabled =
    true;

  itemModal.hidden = false;

  window.setTimeout(() => {

    itemNameInput.focus();

  }, 50);

}


function openEditModal(item) {

  editingItemId =
    item.id;

  modalTitle.textContent =
    "Edit Menu Item";

  modalSave.textContent =
    "Save Changes";

  itemNameInput.value =
    item.name || "";

  itemPriceInput.value =
    Number(item.price || 0);

  itemCategoryInput.value =
    item.category || "Main Course";

  itemCategoryInput.disabled =
    true;

  itemModal.hidden = false;

  window.setTimeout(() => {

    itemNameInput.focus();

    itemNameInput.select();

  }, 50);

}


function closeModal() {

  itemModal.hidden = true;

  editingItemId = null;

  itemForm.reset();

  itemCategoryInput.disabled =
    false;

}


/* =========================================================
   RENDER ADMIN MENU
   ========================================================= */

function renderAdminMenu(items) {

  const groups = [
    "Main Course",
    "Raita",
    "Roti",
    "Drinks"
  ];


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


  menuRoot.innerHTML =
    groups
      .map(category => {

        const categoryItems =
          items.filter(
            item =>
              item.category === category
          );


        return `
          <section
            class="admin-category"
            data-category="${category}"
          >

            <div class="admin-category-title">

              <h2>
                ${category}
              </h2>

              <span>
                ${categoryItems.length}
                ${categoryItems.length === 1
                  ? "item"
                  : "items"}
              </span>

            </div>


            ${
              categoryItems.length
                ? categoryItems
                    .map(item => `

                      <article
                        class="admin-item ${
                          item.available === false
                            ? "is-off"
                            : ""
                        }"
                        data-item-id="${item.id}"
                      >


                        <!-- EDIT -->

                        <button
                          class="edit-item-btn"
                          type="button"
                          data-edit-item="${item.id}"
                          title="Edit ${item.name}"
                          aria-label="Edit ${item.name}"
                        >
                          ✏️
                        </button>


                        <!-- NAME + PRICE -->

                        <div class="item-info">

                          <span class="item-name">
                            ${item.name}
                          </span>

                          <span class="item-price">
                            ${money(item.price)}
                          </span>

                        </div>


                        <!-- AVAILABILITY -->

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
                    .join("")
                : `
                    <div class="admin-empty">
                      <strong>
                        No items in this section.
                      </strong>

                      <span>
                        Add the first item below.
                      </span>
                    </div>
                  `
            }


            <!-- ADD ITEM -->

            <div class="add-item-area">

              <button
                class="add-item-btn"
                type="button"
                data-add-item="${category}"
              >
                ＋ Add Item
              </button>

            </div>


          </section>
        `;

      })
      .join("");


  attachMenuControls(items);

}


/* =========================================================
   MENU CONTROLS
   ========================================================= */

function attachMenuControls(items) {


  /* ---------------------------------------------
     EDIT BUTTONS
     --------------------------------------------- */

  menuRoot
    .querySelectorAll(
      "[data-edit-item]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const id =
            button.dataset.editItem;

          const item =
            items.find(
              entry =>
                entry.id === id
            );

          if (!item) {

            showAdminMessage(
              "Could not find this menu item.",
              "error"
            );

            return;

          }

          openEditModal(item);

        }
      );

    });


  /* ---------------------------------------------
     ADD BUTTONS
     --------------------------------------------- */

  menuRoot
    .querySelectorAll(
      "[data-add-item]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          openAddModal(
            button.dataset.addItem
          );

        }
      );

    });


  /* ---------------------------------------------
     AVAILABILITY SWITCHES
     --------------------------------------------- */

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
            input.closest(
              ".admin-item"
            );

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
                  ".item-name"
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


/* =========================================================
   ADD / EDIT ITEM
   ========================================================= */

itemForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    const name =
      itemNameInput.value.trim();


    const price =
      Number(itemPriceInput.value);


    const category =
      itemCategoryInput.value;


    if (!name) {

      showAdminMessage(
        "Please enter an item name.",
        "error"
      );

      return;

    }


    if (
      !Number.isFinite(price) ||
      price < 0
    ) {

      showAdminMessage(
        "Please enter a valid price.",
        "error"
      );

      return;

    }


    modalSave.disabled = true;


    try {


      /* -----------------------------------------
         EDIT EXISTING ITEM
         ----------------------------------------- */

      if (editingItemId) {

        await updateDoc(
          doc(
            db,
            "menu",
            editingItemId
          ),
          {
            name,
            price
          }
        );


        showAdminMessage(
          `${name} updated successfully.`,
          "success"
        );


      }

      /* -----------------------------------------
         ADD NEW ITEM
         ----------------------------------------- */

      else {

        await addDoc(
          collection(
            db,
            "menu"
          ),
          {
            id: createId(),
            name,
            price,
            category,
            available: true
          }
        );


        showAdminMessage(
          `${name} added to ${category}.`,
          "success"
        );

      }


      closeModal();


    } catch (error) {

      console.error(
        "Menu save error:",
        error
      );


      showAdminMessage(
        editingItemId
          ? "Could not update the menu item."
          : "Could not add the menu item.",
        "error"
      );


    } finally {

      modalSave.disabled = false;

    }

  }
);


/* =========================================================
   MODAL EVENTS
   ========================================================= */

modalClose.addEventListener(
  "click",
  closeModal
);


modalCancel.addEventListener(
  "click",
  closeModal
);


itemModal.addEventListener(
  "click",
  event => {

    if (
      event.target === itemModal
    ) {

      closeModal();

    }

  }
);


document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape" &&
      !itemModal.hidden
    ) {

      closeModal();

    }

  }
);


/* =========================================================
   LOGIN
   ========================================================= */

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


/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

forgotPasswordButton.addEventListener(
  "click",
  async () => {

    const email =
      document
        .getElementById("email")
        .value
        .trim();


    if (!email) {

      setLoginMessage(
        "Enter your email address first.",
        "error"
      );


      document
        .getElementById("email")
        .focus();


      return;

    }


    forgotPasswordButton.disabled =
      true;


    forgotPasswordButton.textContent =
      "Sending reset email…";


    try {

      await sendPasswordResetEmail(
        auth,
        email
      );


      setLoginMessage(
        "Password reset email sent. Check your inbox and spam folder.",
        "info"
      );


    } catch (error) {

      console.error(
        "Password reset error:",
        error
      );


      let message =
        "Unable to send the reset email. Please check the email address and try again.";


      if (
        error.code ===
        "auth/invalid-email"
      ) {

        message =
          "Please enter a valid email address.";

      }

      else if (
        error.code ===
        "auth/user-not-found"
      ) {

        message =
          "No account was found with this email address.";

      }

      else if (
        error.code ===
        "auth/too-many-requests"
      ) {

        message =
          "Too many reset attempts. Please wait and try again later.";

      }


      setLoginMessage(
        message,
        "error"
      );


    } finally {

      forgotPasswordButton.disabled =
        false;

      forgotPasswordButton.textContent =
        "Forgot password?";

    }

  }
);


/* =========================================================
   LOGOUT
   ========================================================= */

logoutButton.addEventListener(
  "click",
  async () => {

    await signOut(auth);

  }
);


/* =========================================================
   INITIALIZE MENU
   ========================================================= */

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

      seedButton.disabled =
        false;

      seedButton.textContent =
        "Initialize Menu";

    }

  }
);


/* =========================================================
   AUTH STATE
   ========================================================= */

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