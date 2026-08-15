import {
  auth,
  db
} from "./firebase.js";


import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";


import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";



/* =========================================================
   ELEMENTS
   ========================================================= */

const loginPanel =
  document.getElementById(
    "photo-login-panel"
  );


const dashboard =
  document.getElementById(
    "photo-dashboard"
  );


const loginForm =
  document.getElementById(
    "photo-login-form"
  );


const loginMessage =
  document.getElementById(
    "photo-login-message"
  );


const logoutButton =
  document.getElementById(
    "photo-logout-btn"
  );


const refreshButton =
  document.getElementById(
    "refresh-photos-btn"
  );


const photoList =
  document.getElementById(
    "photo-admin-list"
  );


const adminMessage =
  document.getElementById(
    "photo-admin-message"
  );


const userEmail =
  document.getElementById(
    "photo-user-email"
  );


const userRole =
  document.getElementById(
    "photo-user-role"
  );


const pendingCount =
  document.getElementById(
    "pending-count"
  );


const approvedCount =
  document.getElementById(
    "approved-count"
  );


const rejectedCount =
  document.getElementById(
    "rejected-count"
  );


const totalCount =
  document.getElementById(
    "total-count"
  );


let allPhotos = [];

let activeFilter = "all";

let unsubscribePhotos = null;



/* =========================================================
   HELPERS
   ========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function formatDate(timestamp) {

  if (!timestamp?.toDate) {
    return "Just now";
  }


  return timestamp
    .toDate()
    .toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short"
      }
    );

}


function showLoginMessage(
  text,
  type = "error"
) {

  loginMessage.textContent =
    text;

  loginMessage.className =
    `form-message ${type}`;

}


function showAdminMessage(
  text,
  type = "info"
) {

  adminMessage.hidden = false;

  adminMessage.textContent =
    text;

  adminMessage.className =
    `admin-alert ${type}`;


  window.clearTimeout(
    showAdminMessage.timer
  );


  showAdminMessage.timer =
    window.setTimeout(
      () => {

        adminMessage.hidden =
          true;

      },
      4500
    );

}


function setView(
  loggedIn
) {

  loginPanel.hidden =
    loggedIn;

  dashboard.hidden =
    !loggedIn;

}



/* =========================================================
   ADMIN AUTHORIZATION
   ========================================================= */

async function getAdminProfile(
  user
) {

  if (!user) {
    return null;
  }


  const profileSnapshot =
    await getDoc(
      doc(
        db,
        "users",
        user.uid
      )
    );


  if (
    !profileSnapshot.exists()
  ) {

    return null;

  }


  const profile =
    profileSnapshot.data();


  if (
    profile.active !== true
  ) {

    return null;

  }


  if (
    profile.role !== "admin"
  ) {

    return null;

  }


  return profile;

}



/* =========================================================
   LOGIN
   ========================================================= */

loginForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    const email =
      document
        .getElementById(
          "photo-email"
        )
        .value
        .trim();


    const password =
      document
        .getElementById(
          "photo-password"
        )
        .value;


    if (!email || !password) {
      return;
    }


    showLoginMessage(
      "Signing in…",
      "info"
    );


    try {

      const credential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );


      const profile =
        await getAdminProfile(
          credential.user
        );


      if (!profile) {

        await signOut(
          auth
        );

        throw new Error(
          "NOT_AUTHORIZED"
        );

      }


    } catch (error) {

      console.error(
        "Photo admin login error:",
        error
      );


      showLoginMessage(

        error.message ===
        "NOT_AUTHORIZED"

          ? "This account is not authorized to manage customer photos."

          : "Sign in failed. Check your email and password."

      );

    }

  }
);



/* =========================================================
   LOGOUT
   ========================================================= */

logoutButton.addEventListener(
  "click",
  async () => {

    await signOut(
      auth
    );

  }
);



/* =========================================================
   STATS
   ========================================================= */

function updateStats() {

  const pending =
    allPhotos.filter(
      photo =>
        photo.status ===
        "pending"
    ).length;


  const approved =
    allPhotos.filter(
      photo =>
        photo.status ===
        "approved"
    ).length;


  const rejected =
    allPhotos.filter(
      photo =>
        photo.status ===
        "rejected"
    ).length;


  pendingCount.textContent =
    pending;


  approvedCount.textContent =
    approved;


  rejectedCount.textContent =
    rejected;


  totalCount.textContent =
    allPhotos.length;

}



/* =========================================================
   STATUS
   ========================================================= */

function statusLabel(
  status
) {

  if (
    status ===
    "approved"
  ) {

    return "Published";

  }


  if (
    status ===
    "rejected"
  ) {

    return "Declined";

  }


  return "Pending";

}



/* =========================================================
   RENDER
   ========================================================= */

function renderPhotos() {

  updateStats();


  let photos =
    [...allPhotos];


  if (
    activeFilter !==
    "all"
  ) {

    photos =
      photos.filter(
        photo =>
          photo.status ===
          activeFilter
      );

  }


  photos.sort(
    (a, b) => {

      const aTime =
        a.createdAt
          ?.toMillis?.() || 0;


      const bTime =
        b.createdAt
          ?.toMillis?.() || 0;


      return bTime - aTime;

    }
  );


  if (!photos.length) {

    photoList.innerHTML = `

      <div class="photo-admin-empty">

        <strong>
          No ${activeFilter === "all"
            ? ""
            : activeFilter + " "
          }photos found.
        </strong>

        <span>
          Customer submissions will appear here.
        </span>

      </div>

    `;

    return;

  }


  photoList.innerHTML =
    photos
      .map(
        photo =>
          createPhotoCard(
            photo
          )
      )
      .join("");


  attachPhotoActions();

}



/* =========================================================
   PHOTO CARD
   ========================================================= */

function createPhotoCard(
  photo
) {

  const status =
    photo.status ||
    "pending";


  const instagram =
    photo.instagramId ||
    "Instagram not provided";


  const comment =
    photo.comment ||
    "No comment provided.";


  const filename =
    photo.originalFilename ||
    "Customer photo";


  const imageUrl =
    photo.imageUrl ||
    "";


  return `

    <article
      class="photo-admin-card"
      data-photo-id="${escapeHtml(photo.id)}"
    >


      <div
        class="photo-admin-image-wrap"
      >

        <a
          class="photo-admin-image-link"
          href="${escapeHtml(imageUrl)}"
          target="_blank"
          rel="noopener"
        >

          <img
            class="photo-admin-image"
            src="${escapeHtml(imageUrl)}"
            alt="Customer submitted photo"
            loading="lazy"
          >

        </a>

      </div>



      <div
        class="photo-admin-details"
      >


        <div
          class="photo-status-row"
        >

          <span
            class="photo-status ${status}"
          >
            ${statusLabel(status)}
          </span>


          <span
            class="photo-date"
          >
            ${escapeHtml(
              formatDate(
                photo.createdAt
              )
            )}
          </span>


          <button
            class="photo-delete-btn"
            type="button"
            data-photo-action="delete"
            data-photo-id="${escapeHtml(photo.id)}"
            title="Delete photo permanently"
            aria-label="Delete photo permanently"
          >
            🗑
          </button>

        </div>



        <h2
          class="photo-instagram"
        >
          ${escapeHtml(
            instagram
          )}
        </h2>


        <p
          class="photo-comment"
        >
          ${escapeHtml(
            comment
          )}
        </p>


        <div
          class="photo-meta"
        >

          <span>
            📷
            ${escapeHtml(
              filename
            )}
          </span>


          <a
            href="${escapeHtml(imageUrl)}"
            target="_blank"
            rel="noopener"
          >
            Open full-quality image ↗
          </a>


          ${
            photo.publicId
              ? `
                <span>
                  Cloudinary:
                  ${escapeHtml(
                    photo.publicId
                  )}
                </span>
              `
              : ""
          }

        </div>



        <div
          class="photo-actions"
        >

          ${
            status === "pending"
              ? `

                <button
                  class="btn btn-primary photo-action-btn"
                  type="button"
                  data-photo-action="approve"
                  data-photo-id="${escapeHtml(photo.id)}"
                >
                  ✓ Approve
                </button>


                <button
                  class="btn btn-outline photo-action-btn"
                  type="button"
                  data-photo-action="decline"
                  data-photo-id="${escapeHtml(photo.id)}"
                >
                  ✕ Decline
                </button>

              `
              : ""
          }

        </div>


      </div>

    </article>

  `;

}



/* =========================================================
   ACTIONS
   ========================================================= */

function attachPhotoActions() {

  photoList
    .querySelectorAll(
      "[data-photo-action]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          async () => {

            const action =
              button.dataset.photoAction;


            const id =
              button.dataset.photoId;


            if (!id) {
              return;
            }


            const card =
              button.closest(
                ".photo-admin-card"
              );


            const buttons =
              card?.querySelectorAll(
                "button"
              ) || [];


            buttons.forEach(
              item => {
                item.disabled =
                  true;
              }
            );


            try {

              /* =====================================
                 APPROVE
                 ===================================== */

              if (
                action ===
                "approve"
              ) {

                await updateDoc(

                  doc(
                    db,
                    "customerPhotos",
                    id
                  ),

                  {

                    status:
                      "approved",

                    approvedAt:
                      serverTimestamp(),

                    reviewedAt:
                      serverTimestamp(),

                    reviewedBy:
                      auth.currentUser.uid

                  }

                );


                showAdminMessage(
                  "Photo approved and published successfully.",
                  "success"
                );

              }


              /* =====================================
                 DECLINE
                 ===================================== */

              else if (
                action ===
                "decline"
              ) {

                const confirmed =
                  window.confirm(
                    "Decline this photo? It will be removed immediately from customer submissions."
                  );


                if (!confirmed) {

                  buttons.forEach(
                    item => {
                      item.disabled =
                        false;
                    }
                  );

                  return;

                }


                await deleteDoc(

                  doc(
                    db,
                    "customerPhotos",
                    id
                  )

                );


                showAdminMessage(
                  "Photo declined and removed.",
                  "success"
                );

              }


              /* =====================================
                 DELETE
                 ===================================== */

              else if (
                action ===
                "delete"
              ) {

                const confirmed =
                  window.confirm(
                    "Delete this photo permanently from the customer photo records?"
                  );


                if (!confirmed) {

                  buttons.forEach(
                    item => {
                      item.disabled =
                        false;
                    }
                  );

                  return;

                }


                await deleteDoc(

                  doc(
                    db,
                    "customerPhotos",
                    id
                  )

                );


                showAdminMessage(
                  "Photo deleted permanently from the website records.",
                  "success"
                );

              }


            } catch (error) {

              console.error(
                "Photo action error:",
                error
              );


              buttons.forEach(
                item => {
                  item.disabled =
                    false;
                }
              );


              showAdminMessage(
                "Could not complete that action. Please try again.",
                "error"
              );

            }

          }
        );

      }
    );

}



/* =========================================================
   FILTERS
   ========================================================= */

document
  .querySelectorAll(
    "[data-photo-filter]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          activeFilter =
            button.dataset.photoFilter;


          document
            .querySelectorAll(
              "[data-photo-filter]"
            )
            .forEach(
              item => {

                item.classList.toggle(
                  "active",
                  item === button
                );

              }
            );


          renderPhotos();

        }
      );

    }
  );



/* =========================================================
   FIRESTORE LISTENER
   ========================================================= */

async function startPhotoListener(
  user
) {

  if (
    unsubscribePhotos
  ) {

    unsubscribePhotos();

    unsubscribePhotos =
      null;

  }


  const profile =
    await getAdminProfile(
      user
    );


  if (!profile) {

    await signOut(
      auth
    );

    showLoginMessage(
      "This account is not authorized to manage customer photos."
    );

    return;

  }


  userEmail.textContent =
    user.email || "";


  userRole.textContent =
    profile.role || "admin";


  setView(true);


  unsubscribePhotos =
    onSnapshot(

      collection(
        db,
        "customerPhotos"
      ),

      snapshot => {

        allPhotos =
          snapshot.docs.map(
            item => ({

              id: item.id,

              ...item.data()

            })
          );


        renderPhotos();

      },

      error => {

        console.error(
          "Customer photo listener error:",
          error
        );


        showAdminMessage(
          "Unable to load customer photos. Check Firestore permissions.",
          "error"
        );

      }

    );

}



/* =========================================================
   REFRESH
   ========================================================= */

refreshButton.addEventListener(
  "click",
  () => {

    renderPhotos();

    showAdminMessage(
      "Photo list refreshed.",
      "success"
    );

  }
);



/* =========================================================
   AUTH STATE
   ========================================================= */

onAuthStateChanged(
  auth,
  user => {

    if (!user) {

      setView(false);

      if (
        unsubscribePhotos
      ) {

        unsubscribePhotos();

        unsubscribePhotos =
          null;

      }

      return;

    }


    startPhotoListener(
      user
    ).catch(
      error => {

        console.error(
          "Photo dashboard error:",
          error
        );

        setView(false);

      }
    );

  }
);