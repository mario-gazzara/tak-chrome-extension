
window.onload = async () => {
    console.log("Linkedin content script loaded");

    if (window.location.href.startsWith("https://www.linkedin.com/in/")) {
        await handlePublicProfile();
    }

    else if (recruiterUrlMatches(window.location.href)) {
        await handleRecruiter(window.location.href);
    }

    chrome.runtime.onMessage.addListener(async (request) => {
        if (request.message === 'public-profile') {
            await handlePublicProfile();
        }
        else if (request.message === 'recruiter') {
            await handleRecruiter(request.url);
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
        document.querySelector("#profileButton").remove();

    let profileButton = createProfileButton(
        "profileButton", 
        "Add to CRM", 
        "#70b5f9");
    
    profileActions.appendChild(profileButton);
}

const handleRecruiter = async (url) => {
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
                action: "get-public-profile",
                data: {
                    profileId: getProfileIdentifier()
                }
            }, function (response) {
                console.log("Profile Response: ", response);

                if(response)
                    openProfileForm(response);
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

    var patt = new RegExp("profile\/(.+)");
    var res = patt.exec(profileUrl);
    
    profileButton.addEventListener('click', () => {
        getRecruiterData()
            .then(recruiter => {
                console.log("Incomplete recruiter: ", recruiter);
                console.log("Sending message...");

                chrome.runtime.sendMessage(
                    {
                        action: "get-recruiter-profile",
                        data: {
                            ...recruiter, 
                            profileUrn: res[1].substring(0, res[1].length-1) 
                        }
                    }, function (response) {
                        console.log("Recruiter Response: ", response);
        
                        if(response)
                            openRecruiterForm(response);
                    });
            });
    });

    return profileButton;
}

const getRecruiterData = async () => {
    const profileContainer = await waitForElement(document, "div.profile__internal-container");

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

const openProfileForm = (profile) => {    
    let modal = document.querySelector('#profile-modal');
    let body = document.querySelector('body');

    if (!modal) {
        console.log("open form");
        body.insertBefore(FORM.createProfileForm(profile), body.firstChild);

        cancelButton = document.querySelector('#profile-cancel-button');
        sendButton = document.querySelector('#profile-send-button');

        if (cancelButton) cancelButton.addEventListener("click", () => FORM.closeMenu(document.querySelector('#profile-modal'))); 

        if (sendButton) sendButton.addEventListener("click", postProfileForm); 
            
    }
    else {
        FORM.closeMenu(modal);
    }
}

const openRecruiterForm = (recruiter) => {
    let modal = document.querySelector('#recruiter-modal');
    let body = document.querySelector('body');

    if (!modal) {
        body.insertBefore(FORM.createRecruiterForm(recruiter), body.firstChild);

        cancelButton = document.querySelector('#recruiter-cancel-button');
        sendButton = document.querySelector('#recruiter-send-button');

        if (cancelButton) cancelButton.addEventListener("click", () => FORM.closeMenu(document.querySelector('#recruiter-modal'))); 

        if (sendButton) sendButton.addEventListener("click", postRecruiterForm);
    }
    else {
        FORM.closeMenu(modal);
    }
}

const postProfileForm = () => {
    const form = document.querySelector('#profile-form');

    if (!form)
        return;

    const request = {
        fullName: form.elements["fullname"].value,
        phoneNumber: form.elements["phoneNumber"].value,
        emailAddress: form.elements["email"].value,
        profileUrl: form.elements["publicUrl"].value,
        company: form.elements["company"].value,
        title: form.elements["title"].value,
        comments: form.elements["comments"].value,
        owner: form.elements["owner"].value,
        quiz: form.elements["quiz"].checked,
        keyword: form.elements["keyword"].value,
        status: form.elements["status"].value,
        acquisition: form.elements["acquisition"].value
    }

    console.log("Payload: ", request);

    chrome.runtime.sendMessage(
        {
            action: "post-profile-to-airtable",
            data: request
        }, function (response) {           
            console.log("Response: ", response); 

            handleResponseStatus(response, "profile");
        });
}

const postRecruiterForm = () => {
    const form = document.querySelector('#recruiter-form');

    if (!form)
        return;

    console.log(form.elements);

    const request = {
        fullName: form.elements["fullname"].value,
        phoneNumber: form.elements["contactPhone"].value,
        emailAddress: form.elements["email"].value,
        profileUrl: form.elements["publicUrl"].value,
        project: form.elements["project"].value,
        comments: form.elements["comments"].value,
        owner: form.elements["owner"].value,
        status: form.elements["status"].value,
        quiz: form.elements["quiz"].checked,
        keyword: form.elements["keyword"].value,
    }

    console.log("Payload: ", request);

    chrome.runtime.sendMessage(
        {
            action: "post-recruiter-to-airtable",
            data: request
        }, function (response) {
            handleResponseStatus(response, "recruiter");
        });
}

const handleResponseStatus = (response, contentType) => {
    if (!response) {
        console.log("Invalid Response");
        return;
    }

    let button = undefined;
    
    if (contentType === "recruiter") {
        button = document.querySelector('#recruiterButton');
    }
    else if (contentType === "profile") {
        button = document.querySelector('#profileButton');
    }

    console.log("Button: ", button);


    if (response.isSucceeded) {
        console.log("handle succeeded response");

        if (button) {
            button.style.backgroundColor = "#4BB543";

            if (contentType === "recruiter") FORM.closeMenu(document.querySelector('#recruiter-modal'));
            else FORM.closeMenu(document.querySelector('#profile-modal'));
        }
    }
    else {
        console.log("handle error response");

        if (button) {
            button.style.backgroundColor = "#f44336";
            errorsContainer = document.querySelector("#errors");

            console.log("Errors Container: ", errorsContainer);

            if (errorsContainer) {
                errorsContainer.innerHTML = `<p>${response.message}</p>`;
            }
        }
    }
} 