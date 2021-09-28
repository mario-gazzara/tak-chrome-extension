window.onload = async () => {
    console.log("Public recruiter content script loaded");
    console.log("Waiting for elements to be loaded...");

    const profileContainer = await waitForElement("div.profile__internal-container");

    console.log({ profileContainer });
}

const waitForElement = (selector) => {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                resolve(document.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}
