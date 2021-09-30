
window.onload = async () => {
    console.log("Linkedin content script loaded");

    if (window.location.href.startsWith("https://www.linkedin.com/in/")) {
        await handlePublicProfile();
    }

    else if (recruiterUrlMatches(window.location.href)) {
        await handleRecruiter(window.location.href, 8000);
    }

    chrome.runtime.onMessage.addListener(async (request) => {
        if (request.message === 'public-profile') {
            await handlePublicProfile();
        }
        else if (request.message === 'recruiter') {
            await handleRecruiter(request.url, 3000);
        }
    
        return true;
    });
}

const handlePublicProfile = async () => {
    console.log("New public profile matched!");
    console.log("Waiting for elements to be loaded...");
    
    const profileActionsSelector = "div.pvs-profile-actions";

    let profileActions = await waitForElement(document, profileActionsSelector);

    console.log(profileActions);

    if (document.querySelector("#profileButton"))
        return;

    let profileButton = createProfileButton(
        "profileButton", 
        "Add to CRM", 
        "#70b5f9");
    
    profileActions.appendChild(profileButton);
}

const handleRecruiter = async (url, delay) => {
    console.log("New recruiter matched!");
    console.log("Waiting for elements to be loaded...");
    
    const itemActionsSelector = "div.profile-item-actions";
    
    const profileContainer = await waitForElement(document, "div.profile__internal-container");
    const actions = await waitForElement(profileContainer, itemActionsSelector);

    const recruiterButton = createRecruiterButton('recruiterButton', 'Add to Matching', "#0073b1", url);
    
    console.log(profileContainer);

    actions.appendChild(recruiterButton);
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
                action: "add-public-profile",
                data: {
                    profileId: getProfileIdentifier()
                }
            });
    });

    return profileButton;
}

const createRecruiterButton = (id, text, color, profileUrl) => {
    var profileButton = document.createElement('button');
    profileButton.id = id;
    profileButton.className = 'profile-item-actions__item artdeco-button artdeco-button--2 artdeco-button--secondary ember-view';
    profileButton.style.color = "white";
    profileButton.style.backgroundColor = color;
    profileButton.innerHTML = text;

    var patt = new RegExp("profile\/(.+)\?project");
    var res = patt.exec(profileUrl);
    
    profileButton.addEventListener('click', () => {
        getRecruiterData()
            .then(recruiter => {
                console.log("Recruiter: ", recruiter);

                chrome.runtime.sendMessage(
                {
                    action: "add-recruiter-profile",
                    data: { ...recruiter, profileUrn: res[1].substring(0, res[1].length-1) }
                });
            })
    });

    return profileButton;
}

const getRecruiterData = async () => {
    const profileContainer = await waitForElement("div.profile__internal-container");

    console.log(profileContainer);

    const fullName = profileContainer.querySelector("div.artdeco-entity-lockup__title")?.innerHTML?.trim();
    const email =  profileContainer.querySelector("[data-test-contact-email-address]")?.innerHTML?.trim();
    const contactPhone =  profileContainer.querySelector("[data-live-test-contact-phone]")?.innerHTML?.trim();

    const topCard = document.querySelector('div.topcard-requisitions__item-block'); 
    const project = topCard?.querySelector('a')?.innerHTML?.trim();

    return {
        fullName,
        email,
        contactPhone,
        project
    }
}
