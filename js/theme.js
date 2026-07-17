(function () {
    const storageKey = "statistis-theme";
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)");

    function storedTheme() {
        try {
            return localStorage.getItem(storageKey);
        } catch (error) {
            return null;
        }
    }

    function saveTheme(theme) {
        try {
            localStorage.setItem(storageKey, theme);
        } catch (error) {
            // The selected theme still works for this page if storage is unavailable.
        }
    }

    function applyTheme(theme) {
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;

        const button = document.getElementById("theme-toggle");
        if (button) {
            const switchingToDark = theme === "light";
            button.textContent = switchingToDark ? "🌙" : "☀️";
            button.title = switchingToDark ? "Zapnout tmavý režim" : "Zapnout světlý režim";
            button.setAttribute("aria-label", button.title);
        }
    }

    const initialTheme = storedTheme() || (systemPrefersDark.matches ? "dark" : "light");
    applyTheme(initialTheme);

    document.addEventListener("DOMContentLoaded", () => {
        const header = document.querySelector("header");
        if (!header) return;

        const button = document.createElement("button");
        button.id = "theme-toggle";
        button.className = "theme-toggle";
        button.type = "button";
        button.addEventListener("click", () => {
            const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
            saveTheme(theme);
            applyTheme(theme);
        });
        header.appendChild(button);
        applyTheme(document.documentElement.dataset.theme);
    });
})();
