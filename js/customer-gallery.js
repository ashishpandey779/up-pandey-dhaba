import { db, auth } from "./firebase.js";

import { signInAnonymously } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const CLOUDINARY_CLOUD_NAME = "nxt0zmyg";
const CLOUDINARY_UPLOAD_PRESET = "up_pandey_customer_photos";
const ADMIN_NOTIFICATION_EMAIL = "arindia.in@gmail.com";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const form = document.getElementById("customer-photo-form");
const photoInput = document.getElementById("customer-photo");
const commentInput = document.getElementById("customer-comment");
const instagramInput = document.getElementById("customer-instagram");
const contactInput = document.getElementById("customer-contact");
const consentInput = document.getElementById("customer-consent");
const submitButton = document.getElementById("customer-submit");
const message = document.getElementById("upload-message");
const preview = document.getElementById("photo-preview");
const previewImage = document.getElementById("photo-preview-image");
const photoGrid = document.getElementById("customer-photo-grid");

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function showMessage(text, type = "info") {
  if (!message) return;
  message.textContent = text;
  message.className = `customer-form-message ${type}`;
}

function setSubmitting(submitting) {
  if (!submitButton) return;
  submitButton.disabled = submitting;
  submitButton.textContent = submitting ? "Uploading..." : "📤 Submit Photo";
}

async function ensureCustomerAuthentication() {
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
}

function normalizeInstagramId(value) {
  let username = String(value || "").trim();
  if (!username) return "";
  if (!username.startsWith("@")) username = `@${username}`;
  return username;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: formData
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Cloudinary upload error:", data);
    throw new Error(data?.error?.message || "Unable to upload the photo.");
  }

  if (!data.secure_url) {
    throw new Error("Cloudinary did not return an image URL.");
  }

  return {
    imageUrl: data.secure_url,
    publicId: data.public_id || "",
    originalFilename: data.original_filename || "",
    width: data.width || null,
    height: data.height || null,
    format: data.format || ""
  };
}

async function createAdminNotification(submission, collaborationContact) {
  const subject = "📸 New Customer Photo Uploaded — UP Pandey Dhaba";
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#222;">
      <h2>📸 New Customer Photo Uploaded</h2>
      <p>A customer has submitted a new photo for UP Pandey Dhaba.</p>
      <hr>
      <p><strong>Instagram:</strong> ${escapeHtml(submission.instagramId)}</p>
      <p><strong>Private collaboration contact:</strong> ${escapeHtml(collaborationContact)}</p>
      <p><strong>Comment:</strong></p>
      <blockquote style="margin:10px 0;padding:12px 16px;border-left:4px solid #d99a1b;background:#f8f3e8;">
        ${escapeHtml(submission.comment)}
      </blockquote>
      <p><strong>Status:</strong> Pending Review</p>
      <p><strong>Photo:</strong> <a href="${submission.imageUrl}" target="_blank">View Photo</a></p>
      <hr>
      <p>Please open the restaurant management dashboard to approve or delete this submission.</p>
    </div>
  `;

  await addDoc(collection(db, "mail"), {
    to: ADMIN_NOTIFICATION_EMAIL,
    message: { subject, html },
    createdAt: serverTimestamp()
  });
}

function injectSuccessStyles() {
  if (document.getElementById("upload-success-gift-styles")) return;

  const style = document.createElement("style");
  style.id = "upload-success-gift-styles";
  style.textContent = `
    .upload-success-overlay{
      position:fixed;
      inset:0;
      z-index:9999;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:24px;
      background:rgba(5,2,1,.94);
      backdrop-filter:blur(14px);
      animation:uploadSuccessFadeIn .25s ease;
    }
    .upload-success-card{
      position:relative;
      width:min(560px,100%);
      padding:46px 30px 34px;
      text-align:center;
      border:1px solid rgba(245,173,32,.48);
      border-radius:28px;
      background:radial-gradient(circle at 50% 0%,rgba(245,173,32,.20),transparent 52%),linear-gradient(145deg,#1c1008,#0d0704);
      box-shadow:0 30px 100px rgba(0,0,0,.55),0 0 55px rgba(245,173,32,.10);
      overflow:hidden;
    }
    .upload-success-card::before{
      content:"";
      position:absolute;
      width:190px;
      height:190px;
      left:50%;
      top:-105px;
      transform:translateX(-50%);
      border-radius:50%;
      background:rgba(245,173,32,.13);
      filter:blur(8px);
    }
    .upload-success-gift{
      position:relative;
      width:112px;
      height:112px;
      margin:0 auto 22px;
      display:grid;
      place-items:center;
      border-radius:50%;
      background:rgba(245,173,32,.10);
      border:1px solid rgba(245,173,32,.34);
      font-size:62px;
      animation:uploadGiftPop .65s cubic-bezier(.2,1.4,.4,1) both;
    }
    .upload-success-card h2{
      position:relative;
      margin:0 0 12px;
      color:#fff3d0;
      font-family:"Roboto Slab",serif;
      font-size:clamp(30px,6vw,46px);
      line-height:1.1;
    }
    .upload-success-card p{
      position:relative;
      margin:0 auto 26px;
      max-width:440px;
      color:#cdbfae;
      line-height:1.7;
    }
    .upload-success-okay{
      position:relative;
      width:min(300px,100%);
      min-height:52px;
      border:0;
      border-radius:12px;
      background:#f5ad20;
      color:#171006;
      font:inherit;
      font-weight:800;
      cursor:pointer;
      box-shadow:0 12px 28px rgba(245,173,32,.20);
      transition:transform .2s ease,box-shadow .2s ease;
    }
    .upload-success-okay:hover{
      transform:translateY(-2px);
      box-shadow:0 16px 34px rgba(245,173,32,.28);
    }
    @keyframes uploadSuccessFadeIn{from{opacity:0}to{opacity:1}}
    @keyframes uploadGiftPop{0%{transform:scale(.35) rotate(-12deg);opacity:0}70%{transform:scale(1.08) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
    @media(max-width:520px){
      .upload-success-overlay{padding:16px}
      .upload-success-card{padding:38px 20px 25px;border-radius:23px}
      .upload-success-gift{width:92px;height:92px;font-size:50px}
    }
  `;
  document.head.appendChild(style);
}

function showSuccessOverlay() {
  injectSuccessStyles();

  document.getElementById("upload-success-overlay")?.remove();

  if (message) {
    message.textContent = "";
    message.className = "customer-form-message";
  }

  const overlay = document.createElement("div");
  overlay.id = "upload-success-overlay";
  overlay.className = "upload-success-overlay";
  overlay.innerHTML = `
    <section class="upload-success-card" role="dialog" aria-modal="true" aria-labelledby="upload-success-title">
      <div class="upload-success-gift" aria-hidden="true">🎁</div>
      <h2 id="upload-success-title">Thank You! 🎉</h2>
      <p>Your photo has been submitted successfully and is now waiting for our team to review. Approved memories may be featured on our website and considered for an Instagram collaboration.</p>
      <button class="upload-success-okay" type="button">Okay</button>
    </section>
  `;

  document.body.appendChild(overlay);
  document.body.classList.add("upload-success-open");

  const okayButton = overlay.querySelector(".upload-success-okay");
  okayButton?.focus();

  okayButton?.addEventListener("click", () => {
    overlay.remove();
    document.body.classList.remove("upload-success-open");

    const uploadModal = document.getElementById("upload-modal");
    if (uploadModal) uploadModal.hidden = true;
    document.body.classList.remove("upload-modal-open");

    const returnPage = new URLSearchParams(window.location.search).get("return");

    if (returnPage === "home") {
      window.location.href = "index.html#home";
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

photoInput?.addEventListener("change", () => {
  const file = photoInput.files?.[0];

  if (!file) {
    if (preview) preview.hidden = true;
    return;
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    photoInput.value = "";
    if (preview) preview.hidden = true;
    showMessage("Please select a JPG, PNG or WebP image.", "error");
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    photoInput.value = "";
    if (preview) preview.hidden = true;
    showMessage("The photo must be smaller than 10 MB.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = event => {
    if (!previewImage) return;
    previewImage.src = event.target.result;
    if (preview) preview.hidden = false;
  };
  reader.readAsDataURL(file);
});

form?.addEventListener("submit", async event => {
  event.preventDefault();

  if (!photoInput?.files?.length) {
    showMessage("Please select a photo first.", "error");
    return;
  }

  const file = photoInput.files[0];

  if (!ALLOWED_TYPES.includes(file.type)) {
    showMessage("Please select a JPG, PNG or WebP image.", "error");
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    showMessage("The photo must be smaller than 10 MB.", "error");
    return;
  }

  const comment = commentInput?.value.trim() || "";
  const instagramId = normalizeInstagramId(instagramInput?.value);
  const contactDetail = contactInput?.value.trim() || "";

  if (!comment) {
    showMessage("Please write something about your visit.", "error");
    commentInput?.focus();
    return;
  }

  if (!instagramId) {
    showMessage("Please enter your Instagram ID.", "error");
    instagramInput?.focus();
    return;
  }

  if (!contactDetail) {
    showMessage("Please enter a WhatsApp number or email address for collaboration contact.", "error");
    contactInput?.focus();
    return;
  }

  if (!consentInput?.checked) {
    showMessage("Please confirm the photo usage permission.", "error");
    return;
  }

  setSubmitting(true);
  showMessage("Uploading your photo...", "info");

  try {
    const customerUser = await ensureCustomerAuthentication();
    const cloudinaryResult = await uploadToCloudinary(file);

    showMessage("Photo uploaded. Saving your submission...", "info");

    const submission = {
      customerUid: customerUser.uid,
      imageUrl: cloudinaryResult.imageUrl,
      publicId: cloudinaryResult.publicId,
      originalFilename: cloudinaryResult.originalFilename,
      width: cloudinaryResult.width,
      height: cloudinaryResult.height,
      format: cloudinaryResult.format,
      comment,
      instagramId,
      consent: true,
      status: "pending",
      createdAt: serverTimestamp()
    };

    const submissionRef = await addDoc(collection(db, "customerPhotos"), submission);

    try {
      await createAdminNotification(
        { ...submission, submissionId: submissionRef.id },
        contactDetail
      );
    } catch (notificationError) {
      console.error("Admin notification error:", notificationError);
    }

    form.reset();
    if (preview) preview.hidden = true;
    if (previewImage) previewImage.src = "";

    showSuccessOverlay();
  } catch (error) {
    console.error("Customer photo submission error:", error);
    showMessage(error?.message || "Unable to submit your photo right now. Please try again.", "error");
  } finally {
    setSubmitting(false);
  }
});

async function loadApprovedPhotos() {
  if (!photoGrid) return;

  try {
<<<<<<< ours
    const photosQuery = query(
      collection(db, "customerPhotos"),
      where("status", "==", "approved")
=======

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
       )
     );

    const snapshot =
      await getDocs(
        photosQuery
      );
    const approvedPhotos =
  snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    .sort((a, b) => {

      const aTime =
        a.approvedAt?.toMillis?.() || 0;

      const bTime =
        b.approvedAt?.toMillis?.() || 0;

      return bTime - aTime;
    });

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
      approvedPhotos
        .map(
          (photo) => {

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
>>>>>>> theirs
    );

    const snapshot = await getDocs(photosQuery);

    const approvedPhotos = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const aTime = a.approvedAt?.toMillis?.() || 0;
        const bTime = b.approvedAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

    if (!approvedPhotos.length) {
      photoGrid.innerHTML = `
        <div class="customer-photo-empty">
          <strong>No customer photos yet.</strong>
          <span>Be the first to share your experience!</span>
        </div>
      `;
      return;
    }

    photoGrid.innerHTML = approvedPhotos.map(photo => `
      <article class="customer-photo-card">
        <a href="${escapeHtml(photo.imageUrl)}" target="_blank" rel="noopener">
          <img class="customer-photo-card-image" src="${escapeHtml(photo.imageUrl)}" alt="Customer photo from UP Pandey Dhaba" loading="lazy">
        </a>
        <div class="customer-photo-card-content">
          <p class="customer-photo-card-comment">${escapeHtml(photo.comment)}</p>
          <div class="customer-photo-card-instagram">${escapeHtml(photo.instagramId)}</div>
        </div>
      </article>
    `).join("");
  } catch (error) {
    console.error("Unable to load approved customer photos:", error);
    photoGrid.innerHTML = `
      <div class="customer-photo-empty">
        <strong>Customer photos are temporarily unavailable.</strong>
        <span>Please check back shortly.</span>
      </div>
    `;
  }
}

loadApprovedPhotos();
