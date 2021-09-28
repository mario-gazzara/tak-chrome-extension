window.onload = async () => {
    console.log("Public recruiter content script loaded");

    chrome.runtime.onMessage.addListener(async (request) => {
          if (request.message === 'scrape') {
            console.log("New profile matched!");
            console.log("Waiting for elements to be loaded...");
            
            await delay(3000);    
            
            const profileContainer = await waitForElement("div.profile__internal-container");
            const profileActions = profileContainer.querySelector("div.profile-item-actions");            
            const button = createProfileButton('recruiterButton', 'Add to Matching', "#0073b1", request.url);
            
            console.log(profileContainer);
            console.log(profileActions);

            profileContainer
                .querySelector("div.profile-item-actions")
                .appendChild(button);
          }
      });
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

const createProfileButton = (id, text, color, profileUrl) => {
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

const delay = ms => new Promise(res => setTimeout(res, ms));

const getRecruiterData = async () => {
    const profileContainer = await waitForElement("div.profile__internal-container");
    const activities = await waitForElement("div.recent-recruiting-activities__body");

    console.log(profileContainer);
    console.log(activities);

    const fullName = profileContainer.querySelector("div.artdeco-entity-lockup__title")?.innerHTML?.trim();
    const email =  profileContainer.querySelector("[data-test-contact-email-address]")?.innerHTML?.trim();
    const contactPhone =  profileContainer.querySelector("[data-live-test-contact-phone]")?.innerHTML?.trim();

    const topCard = document.querySelector('div.topcard-requisitions__item-block'); 
    const project = topCard?.querySelector('a')?.innerHTML?.trim();

    const firstRecruitingActivity = activities
        .firstElementChild
        ?.firstElementChild
        ?.children[1]
        .firstElementChild
        ?.querySelector('strong')
        .innerHTML?.trim();

    return {
        fullName,
        email,
        contactPhone,
        project,
        firstRecruitingActivity
    }
}

function getElementByAttribute(attr, value, root) {
    root = root || document.body;
    if(root.hasAttribute(attr) && root.getAttribute(attr) == value) {
        return root;
    }
    var children = root.children, 
        element;
    for(var i = children.length; i--; ) {
        element = getElementByAttribute(attr, value, children[i]);
        if(element) {
            return element;
        }
    }
    return null;
}