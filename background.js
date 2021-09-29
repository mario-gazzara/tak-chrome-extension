const LINKEDIN_BASE_URL = 'https://www.linkedin.com';
const LINKEDIN_API_URL = `${LINKEDIN_BASE_URL}/voyager/api`;

const AIRTABLE_MATCHING_COPY_URL = "https://api.airtable.com/v0/appTZexPXpkZv2hLx";
const AIRTABLE_CRM_URL = "https://api.airtable.com/v0/appgMU7xlREyqmWai";
const AIRTABLE_META_API_URL = "https://api.airtable.com/v0/meta";

const AIRTABLE_PROFILES_TABLE = `${AIRTABLE_MATCHING_COPY_URL}/Profils`;
const AIRTABLE_CRM_TABLE = `${AIRTABLE_CRM_URL}/CRM`;

const AIRTABLE_API_KEY = "keyCfydEMoBPBkBij";

const ACTIONS = {
    ADD_PUBLIC_PROFILE: 'add-public-profile',
    ADD_RECRUITER_PROFILE: 'add-recruiter-profile',
};

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) {
        console.log("url: ", changeInfo.url);
        
        tryMatchRecruiterProfile(tabId, changeInfo.url);
        tryMatchPublicProfile(tabId, changeInfo.url);
    }
});

chrome.runtime.onMessage.addListener(async (message) => {
   switch (message.action) {
       case ACTIONS.ADD_PUBLIC_PROFILE:
           console.log("Adding public profile...");

           await handleAddPublicProfile(message.data.profileId);       
           return true;

        case ACTIONS.ADD_RECRUITER_PROFILE:
           console.log("Adding recruiter profile...");

           await handleAddRecruiterProfile(message.data);       
           return true;
   }  
});

const tryMatchRecruiterProfile = (tabId, url) => {
    var patt = new RegExp("https:\/\/www.linkedin.com\/talent\/hire\/.+\/discover\/applicants\/profile\/.+");
    var res = patt.test(url);
    
    if (!res) return;

    chrome.tabs.sendMessage(tabId, {
        message: 'recruiter',
        url
    });
}

const tryMatchPublicProfile = (tabId, url) => {
    if(!url.startsWith("https://www.linkedin.com/in/"))
        return;

    console.log("match public profile");

    chrome.tabs.sendMessage(tabId, {
        message: 'public-profile',
        url
    });
}

const getCsrfToken = (jsessionId) => {
    if (jsessionId === undefined || jsessionId.length == 0)
        return undefined;

    if (jsessionId.startsWith("\""))
        return jsessionId.substr(1, jsessionId.length - 2) ?? undefined;

    return jsessionId.substr(0, jsessionId.length) ?? undefined;
}

const getJSessionId = (url, name) => {
    return new Promise((resolve, reject) => {
        chrome.cookies.get(
            {
                "url": url,
                "name": name
            },
            cookie => {
                if (cookie)
                    resolve(cookie.value);
                else
                    reject("Cant't get jsessionid");
            }
        )
    })
}

const handleResponse = (response) => {
    return response.text().then(textResponse => {
        const jsonResponse = textResponse && JSON.parse(textResponse);

        return !response.ok ? 
            {
                isSucceeded: response.ok,
                statusCode: response.status
            } :
            {
                isSucceeded: response.ok,
                statusCode: response.status,
                data: jsonResponse
            };
    });
}

const airtableAPIRequest = async (endpoint, method, body = null) =>
    handleResponse(await fetch(endpoint, {
        method: method,
        headers: { 
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json', 
        },
        body: body && JSON.stringify(body)
    }));

const voyagerAPIRequest = async (endpoint, headers = {}) => {
    let jsessionid = await getJSessionId(LINKEDIN_BASE_URL, 'JSESSIONID');

    csrfToken = getCsrfToken(jsessionid);

    let response = await fetch(
        endpoint,
        {
            headers: {
                'csrf-token': csrfToken,
                ...headers
            },
            credentials: 'include'
        });

    return await response.json();
}

const getProfile = async (publicIdentifier = null, urn = null) =>
    await voyagerAPIRequest(`${LINKEDIN_API_URL}/identity/profiles/${publicIdentifier || urn}/profileView`);

const getContactInfo = async (publicIdentifier) =>
    await voyagerAPIRequest(`${LINKEDIN_API_URL}/identity/profiles/${publicIdentifier}/profileContactInfo`);

const handleAddPublicProfile = async (profileId) => {
    const publicProfile = await getProfile(profileId);
    const contactInfo = await getContactInfo(profileId);
    
    // console.log("profile: ", publicProfile);
    // console.log("contact info: ", contactInfo);

    const fullName = publicProfile.profile.firstName + " " + publicProfile.profile.lastName;

    const phoneNumbers = contactInfo?.phoneNumbers;
    let phoneNuber = undefined;

    if (phoneNumbers) {
        phoneNuber = phoneNumbers.find(pn => {
            if (pn.type === "MOBILE")
                return true;
        });       

        if (!phoneNuber)
            phoneNuber = phoneNuber[0];
    }

    const emailAddress = contactInfo?.emailAddress;
    const profileUrl = `https://www.linkedin.com/in/${profileId}/`;

    const experiences = publicProfile.positionView.elements;
    let company = undefined;
    let title = undefined;

    if (experiences.length > 0) {
        company = experiences[0].companyName;
        title = experiences[0].title;
    }

    console.log({
        fullName,
        phoneNuber,
        emailAddress,
        profileUrl,
        company,
        title
    });

    const response = await airtableAPIRequest(
        AIRTABLE_CRM_TABLE, 
        'POST', 
        {
            "fields": {
                "Nom": fullName,
                "Téléphone": phoneNuber !== undefined ? phoneNuber : "",
                "Email": emailAddress !== undefined ? emailAddress : "",
                "Entreprise": company !== undefined ? company : "",
                "Titre" : title != undefined ? title : "",
                "URL Linkedin": profileUrl
            },
            "typecast": true
        });

    console.log(response);
}

const handleAddRecruiterProfile = async (recruiter) => {
    const recruiterPublicProfile = await getProfile(recruiter.profileUrn);
    const publicIdentifier = recruiterPublicProfile?.profile?.miniProfile?.publicIdentifier;

    recruiter = { 
        ...recruiter, 
        "profileUrl": `https://www.linkedin.com/in/${publicIdentifier}/` 
    };

    console.log("recruiter: ", recruiter);

    const response = await airtableAPIRequest(
        AIRTABLE_PROFILES_TABLE, 
        'POST', 
        {
            "fields": {
                "Nom": recruiter.fullName,
                "Téléphone": recruiter.contactPhone,
                "Email": recruiter.email,
                "Acquisition": "Annonce Linkedin",
                "Profil" : recruiter.project,
                "Linkedin URL": recruiter.profileUrl,
                "Statut": "SMS à envoyer",
                "Commentaires": "Add from Linkedin auto",
                "Owner": recruiter.owner
            },
            "typecast": true
        });

    console.log(response);
}

