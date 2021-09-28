window.onload = async () => {
    const profileActionsSelector = "div.pvs-profile-actions";

    console.log("Public linkedin profile content script loaded");
    console.log("Waiting for elements to be loaded...");

    let profileActions = await waitForElement(profileActionsSelector);

    console.log(profileActions);

    let profileButton = createProfileButton(
        "profileButton", 
        "Add to Matching", 
        "#70b5f9");
    
    injectButton(profileButton, profileActionsSelector);
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

const createProfileButton = (id, text, color) => {
    var profileButton = document.createElement('button');
    profileButton.id = id;
    profileButton.className = 'message-anywhere-button pvs-profile-actions__action artdeco-button';
    profileButton.style.backgroundColor = color;
    profileButton.innerHTML = text;

    profileButton.addEventListener('click', () => {
        chrome.runtime.sendMessage(
            {
                action: "add-to-matching",
                data: {
                    profileId: getProfileIdentifier()
                }
            });
    });

    return profileButton;
}

const injectButton = (button, selector) => {
    document.querySelector(selector)
        .appendChild(button);
} 

const getProfileIdentifier = () => {
    var url = window.location.href;
    var paths = url.split('/');

    return paths.length > 1 ? paths[paths.length -2] : '';
}