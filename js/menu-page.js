import { subscribeToMenu } from "./menu-data.js";

const categories = [
  ["Main Course", "Pure Vegetarian", "01"],
  ["Raita", "Fresh & Cooling", "02"],
  ["Roti", "Freshly Made", "03"],
  ["Drinks", "Refreshing", "04"]
];

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function renderMenu(items) {
  const root = document.getElementById("live-menu");

  if (!root) return;

  if (!items.length) {
    root.innerHTML = `
      <div class="menu-empty">
        <strong>Menu is being prepared.</strong>
        <span>Please check back shortly.</span>
      </div>
    `;

    return;
  }

  root.innerHTML = categories
    .map(([category, note, number]) => {

      const categoryItems = items.filter(
        item => item.category === category
      );

      if (!categoryItems.length) return "";

      return `
        <div class="menu-category">

          <div class="category-heading">
            <div>
              <span class="category-number">${number}</span>
              <h2>${category}</h2>
            </div>

            <span class="category-note">
              ${note}
            </span>
          </div>

          <div class="price-list">

            ${categoryItems
              .map(item => `
                <div class="menu-row ${
                  item.available === false
                    ? "unavailable"
                    : ""
                }">

                  <span class="menu-item-name">
                    ${item.name}
                  </span>

                  <span class="menu-item-price">
                    ${money(item.price)}
                  </span>

                  ${
                    item.available === false
                      ? `
                        <span class="unavailable-badge">
                          Currently Unavailable
                        </span>
                      `
                      : ""
                  }

                </div>
              `)
              .join("")}

          </div>

        </div>
      `;
    })
    .join("");
}

subscribeToMenu(
  renderMenu,
  (error) => {

    console.error(
      "Menu listener error:",
      error
    );

    const root =
      document.getElementById("live-menu");

    if (root) {
      root.innerHTML = `
        <div class="menu-empty">
          <strong>
            Unable to load the live menu.
          </strong>

          <span>
            Please refresh the page and try again.
          </span>
        </div>
      `;
    }
  }
);