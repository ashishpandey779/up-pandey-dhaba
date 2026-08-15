import {
  db,
  auth
} from "./firebase.js";

import {
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


/* =========================================================
   CONFIGURATION
   ========================================================= */

const CLOUDINARY_CLOUD_NAME = "nxt0zmyg";

const CLOUDINARY_UPLOAD_PRESET =
  "up_pandey_customer_photos";


/*
 * This is the fixed restaurant/admin email.
 *
 * The customer does NOT provide an email.
 *
 * The Firestore Trigger Email extension will use
 * documents created inside the "mail" collection.
 */
const ADMIN_NOTIFICATION_EMAIL =
  "arindia.in@gmail.com";


const CLOUDINARY_UPLOAD_URL =
  `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;


/* =========================================================
   ELEMENTS
   ========================================================= */

const form =
  document.getElementById("customer-photo-form");

const photoInput =
  document.getElementById("customer-photo");

const commentInput =
  document.getElementById("customer-comment");

const instagramInput =
  document.getElementById("customer-instagram");

const consentInput =
  document.getElementById("customer-consent");

const submitButton =
  document.getElementById("customer-submit");

const message =
  document.getElementById("upload-message");

const preview =
  document.getElementById("photo-preview");

const previewImage =
  document.getElementById("photo-preview-image");

const photoGrid =
  document.getElementById("customer-photo-grid");


/* =========================================================
   CONSTANTS
   ========================================================= */

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];


/* =========================================================
   HELPERS
   ========================================================= */

function showMessage(
  text,
  type = "info"
) {

  if (!message) return;

  message.textContent = text;

  message.className =
    `customer-form-message ${type}`;

}


function setSubmitting(
  submitting
) {

  if (!submitButton) return;

  submitButton.disabled =
    submitting;

  submitButton.textContent =
    submitting
      ? "Uploading..."
      : "📤 Submit Photo";

}


async function ensureCustomerAuthentication() {

  if (auth.currentUser) {
    return auth.currentUser;
  }

  const credential =
    await signInAnonymously(auth);

  return credential.user;
}

/* =========================================================
   INSTAGRAM NORMALIZATION
   ========================================================= */

function normalizeInstagramId(
  value
) {

  let username =
    String(value || "").trim();

  if (!username) {
    return "";
  }

  if (!username.startsWith("@")) {
    username = `@${username}`;
  }

  return username;
}


/* =========================================================
   CLOUDINARY UPLOAD
   ========================================================= */

async function uploadToCloudinary(
  file
) {

  const formData =
    new FormData();

  formData.append(
    "file",
    file
  );

  formData.append(
    "upload_preset",
    CLOUDINARY_UPLOAD_PRESET
  );


  const response =
    await fetch(
      CLOUDINARY_UPLOAD_URL,
      {
        method: "POST",
        body: formData
      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    console.error(
      "Cloudinary upload error:",
      data
    );

    throw new Error(
      data?.error?.message ||
      "Unable to upload the photo."
    );

  }


  if (!data.secure_url) {

    throw new Error(
      "Cloudinary did not return an image URL."
    );

  }


  return {
    imageUrl: data.secure_url,
    publicId: data.public_id || "",
    originalFilename:
      data.original_filename || "",
    width: data.width || null,
    height: data.height || null,
    format: data.format || ""
  };

}


/* =========================================================
   ADMIN EMAIL NOTIFICATION
   ========================================================= */

/*
 * This creates a document inside Firestore's "mail"
 * collection.
 *
 * Firebase's Trigger Email extension watches this
 * collection and sends the actual email.
 */

async function createAdminNotification(
  submission
) {

  const subject =
    "📸 New Customer Photo Uploaded — UP Pandey Dhaba";


  const html =
    `
      <div
        style="
          font-family:Arial,sans-serif;
          max-width:650px;
          margin:auto;
          color:#222;
        "
      >

        <h2>
          📸 New Customer Photo Uploaded
        </h2>

        <p>
          A customer has submitted a new photo
          for UP Pandey Dhaba.
        </p>

        <hr>

        <p>
          <strong>Instagram:</strong>
          ${escapeHtml(submission.instagramId)}
        </p>

        <p>
          <strong>Comment:</strong>
        </p>

        <blockquote
          style="
            margin:10px 0;
            padding:12px 16px;
            border-left:4px solid #d99a1b;
            background:#f8f3e8;
          "
        >
          ${escapeHtml(submission.comment)}
        </blockquote>

        <p>
          <strong>Status:</strong>
          Pending Review
        </p>

        <p>
          <strong>Photo:</strong>
          <a
            href="${submission.imageUrl}"
            target="_blank"
          >
            View Photo
          </a>
        </p>

        <hr>

        <p>
          Please open the restaurant management
          dashboard to approve or delete this submission.
        </p>

      </div>
    `;


  await addDoc(
    collection(db, "mail"),
    {
      to: ADMIN_NOTIFICATION_EMAIL,

      message: {
        subject,
        html
      },

      createdAt:
        serverTimestamp()
    }
  );

}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(
  value
) {

  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* =========================================================
   PHOTO PREVIEW
   ========================================================= */

photoInput?.addEventListener(
  "change",
  () => {

    const file =
      photoInput.files?.[0];


    if (!file) {

      if (preview) {
        preview.hidden = true;
      }

      return;
    }


    if (
      !ALLOWED_TYPES.includes(
        file.type
      )
    ) {

      photoInput.value = "";

      if (preview) {
        preview.hidden = true;
      }

      showMessage(
        "Please select a JPG, PNG or WebP image.",
        "error"
      );

      return;
    }


    if (
      file.size > MAX_FILE_SIZE
    ) {

      photoInput.value = "";

      if (preview) {
        preview.hidden = true;
      }

      showMessage(
        "The photo must be smaller than 10 MB.",
        "error"
      );

      return;
    }


    const reader =
      new FileReader();


    reader.onload =
      (event) => {

        if (!previewImage) return;

        previewImage.src =
          event.target.result;

        if (preview) {
          preview.hidden = false;
        }

      };


    reader.readAsDataURL(file);

  }
);


/* =========================================================
   SUBMIT PHOTO
   ========================================================= */

form?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    if (!photoInput?.files?.length) {

      showMessage(
        "Please select a photo first.",
        "error"
      );

      return;
    }


    const file =
      photoInput.files[0];


    if (
      !ALLOWED_TYPES.includes(
        file.type
      )
    ) {

      showMessage(
        "Please select a JPG, PNG or WebP image.",
        "error"
      );

      return;
    }


    if (
      file.size > MAX_FILE_SIZE
    ) {

      showMessage(
        "The photo must be smaller than 10 MB.",
        "error"
      );

      return;
    }


    const comment =
      commentInput?.value.trim() || "";


    const instagramId =
      normalizeInstagramId(
        instagramInput?.value
      );


    if (!comment) {

      showMessage(
        "Please write something about your visit.",
        "error"
      );

      commentInput?.focus();

      return;
    }


    if (!instagramId) {

      showMessage(
        "Please enter your Instagram ID.",
        "error"
      );

      instagramInput?.focus();

      return;
    }


    if (!consentInput?.checked) {

      showMessage(
        "Please confirm the photo usage permission.",
        "error"
      );

      return;
    }


    setSubmitting(true);

    showMessage(
      "Uploading your photo...",
      "info"
    );


    try {

      /* ---------------------------------------------
         1. Upload image to Cloudinary
         --------------------------------------------- */

      const customerUser =
         await ensureCustomerAuthentication();


        const cloudinaryResult =
            await uploadToCloudinary(file);


      showMessage(
        "Photo uploaded. Saving your submission...",
        "info"
      );


      /* ---------------------------------------------
         2. Save submission to Firestore
         --------------------------------------------- */

      const submission = {

        customerUid:
            customerUser.uid,

        imageUrl:
          cloudinaryResult.imageUrl,

        publicId:
          cloudinaryResult.publicId,

        originalFilename:
          cloudinaryResult.originalFilename,

        width:
          cloudinaryResult.width,

        height:
          cloudinaryResult.height,

        format:
          cloudinaryResult.format,

        comment,

        instagramId,

        consent: true,

        status: "pending",

        createdAt:
          serverTimestamp()

      };


      const submissionRef =
        await addDoc(
          collection(
            db,
            "customerPhotos"
          ),
          submission
        );


      /* ---------------------------------------------
         3. Create admin email notification
         --------------------------------------------- */

      try {

        await createAdminNotification({

          ...submission,

          submissionId:
            submissionRef.id

        });

      } catch (
        notificationError
      ) {

        /*
         * The photo submission itself is already
         * saved successfully.
         *
         * Don't tell the customer that their
         * submission failed just because the
         * notification service had an issue.
         */

        console.error(
          "Admin notification error:",
          notificationError
        );

      }


      /* ---------------------------------------------
         4. Success
         --------------------------------------------- */

      form.reset();


      if (preview) {
        preview.hidden = true;
      }


      if (previewImage) {
        previewImage.src = "";
      }


      showMessage(
        "🎉 Thank you! Your photo has been submitted for review. Approved photos may be featured on our website and considered for an Instagram collaboration within 48 hours.",
        "success"
      );


    } catch (
      error
    ) {

      console.error(
        "Customer photo submission error:",
        error
      );


      showMessage(
        error?.message ||
        "Unable to submit your photo right now. Please try again.",
        "error"
      );

    } finally {

      setSubmitting(false);

    }

  }
);


/* =========================================================
   LOAD APPROVED CUSTOMER PHOTOS
   ========================================================= */

async function loadApprovedPhotos() {

  if (!photoGrid) return;


  try {

    const photosQuery =
      query(
        collection(
          db,
          "customerPhotos"
        ),

        where(
          "status",
          "==",
          "approved"
        ),

        orderBy(
          "approvedAt",
          "desc"
        )
      );


    const snapshot =
      await getDocs(
        photosQuery
      );


    if (
      snapshot.empty
    ) {

      photoGrid.innerHTML =
        `
          <div class="customer-photo-empty">

            <strong>
              No customer photos yet.
            </strong>

            <span>
              Be the first to share your experience!
            </span>

          </div>
        `;

      return;
    }


    photoGrid.innerHTML =
      snapshot.docs
        .map(
          (doc) => {

            const photo =
              doc.data();


            return `
              <article
                class="customer-photo-card"
              >

                <a
                  href="${escapeHtml(photo.imageUrl)}"
                  target="_blank"
                  rel="noopener"
                >

                  <img
                    class="customer-photo-card-image"
                    src="${escapeHtml(photo.imageUrl)}"
                    alt="Customer photo from UP Pandey Dhaba"
                    loading="lazy"
                  >

                </a>


                <div
                  class="customer-photo-card-content"
                >

                  <p
                    class="customer-photo-card-comment"
                  >
                    ${escapeHtml(photo.comment)}
                  </p>

                  <div
                    class="customer-photo-card-instagram"
                  >
                    ${escapeHtml(photo.instagramId)}
                  </div>

                </div>

              </article>
            `;

          }
        )
        .join("");


  } catch (
    error
  ) {

    console.error(
      "Unable to load approved customer photos:",
      error
    );


    photoGrid.innerHTML =
      `
        <div class="customer-photo-empty">

          <strong>
            Customer photos are temporarily unavailable.
          </strong>

          <span>
            Please check back shortly.
          </span>

        </div>
      `;

  }

}


/* =========================================================
   START
   ========================================================= */

loadApprovedPhotos();