const LINKEDIN_BASE_URL = 'https://www.linkedin.com';
const LINKEDIN_API_URL = `${LINKEDIN_BASE_URL}/voyager/api`;

const AIRTABLE_API_KEY = "keyCfydEMoBPBkBij";
const AIRTABLE_BASE_URL = "https://api.airtable.com/v0";
const AIRTABLE_MATCHING_URL = `${AIRTABLE_BASE_URL}/apptAEasYrcjwDKZC`;
const AIRTABLE_PROFILES_TABLE = `${AIRTABLE_MATCHING_URL}/Profils`;

const ACTIONS = {
    GET_PUBLIC_PROFILE: 'get-public-profile',
    GET_RECRUITER_PROFILE: 'get-recruiter-profile',
    POST_PROFILE_TO_AIRTABLE: 'post-profile-to-airtable',
    POST_RECRUITER_TO_AIRTABLE: 'post-recruiter-to-airtable',
};

let owner = undefined;
let projects = [];
let acquisitions = [];

chrome.storage.local.get((items) => owner = items.oldOwner );

chrome.extension.onConnect.addListener(function(port) {
    console.log("Connected...");

    port.onMessage.addListener(function(request) {
        owner = request.owner;
        projects = request.projects;
        acquisitions = request.acquisitions;

        console.log("New owner: ", owner);
        console.log("New projects: ", projects);
        console.log("New acquisitions: ", acquisitions);
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) {
        // console.log("url: ", changeInfo.url);
        
        tryMatchRecruiterProfile(tabId, changeInfo.url);
        tryMatchPublicProfile(tabId, changeInfo.url);
    }
});

chrome.runtime.onMessage.addListener((request, _sender, response) => {
   switch (request.action) {
       case ACTIONS.GET_PUBLIC_PROFILE:
           console.log("Getting public profile...");

           (async () => {
                const profile = await handleGetPublicProfile(request.data.profileId);       
            
                console.log("Profile: ", profile);
                
                response(profile);
           })();
        
           return true;

        case ACTIONS.GET_RECRUITER_PROFILE:
            (async () => {
                console.log("Getting recruiter profile...");

                const recruiter = await handleGetRecruiterProfile(request.data);

                response(recruiter);
            })();
           
           return true;

        case ACTIONS.POST_PROFILE_TO_AIRTABLE:
            (async () => {
                console.log("Posting profile to airtable...");

                const airtableResponse = await postPublicProfile(request.data);
                
                response(airtableResponse);
            })();
           
           return true;

        case ACTIONS.POST_RECRUITER_TO_AIRTABLE:
            (async () => {
                console.log("Posting recruiter to airtable...");

                const airtableResponse = await postRecruiter(request.data);

                response(airtableResponse);
            })();
           
           return true;
   }  
});

const tryMatchRecruiterProfile = (tabId, url) => {
    var patt = new RegExp("https:\/\/www.linkedin.com\/talent\/hire\/.+\/discover\/applicants\/profile\/.+");
    var patt1 = new RegExp("https:\/\/www.linkedin.com\/talent\/profile\/.+");

    var res = patt.test(url);
    var res1 = patt1.test(url);

    console.log("search: ", res1); 
    console.log("from recruiter: ", res);

    if (!res && !res1) return;

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
                statusCode: response.status,
                message: jsonResponse?.error?.message ?? ""
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

const cleanPhoneNumber = (phoneNumber) => {
    phoneNumber.number = phoneNumber.number.replace(/\+|,|\.|\(|\)|-|\s/g, '');
    return phoneNumber;
}

const cleanRecruiterPhoneNumber = (phoneNumber) => 
    phoneNumber?.replace(/\+|,|\.|\(|\)|-|\s/g, '');
    
const getPhoneNumberStartsWith = (phoneNumbers, prefix) => 
    phoneNumbers.find(phoneNuber => phoneNuber.number.startsWith(prefix));

const getBestPhoneNumber = (phoneNumbers) => {
    if (!phoneNumbers)
        return undefined;

    let phoneNuber = undefined;

    const prefixes = [
        '06',
        '07',
        '336',
        '337',
        '3306',
        '3307',
        '33',
        '0033',
    ]

    for (const prefix of prefixes) {
        phoneNuber = getPhoneNumberStartsWith(phoneNumbers, prefix);
        
        if (phoneNuber)
            return cleanPhoneNumber(phoneNuber);
    }

    phoneNuber = phoneNumbers.find(pn => pn.type === "MOBILE");

    if (phoneNuber)
        return cleanPhoneNumber(phoneNuber)

    if (!phoneNuber)
        return phoneNuber[0];
}

const handleGetPublicProfile = async (profileId) => {
    const publicProfile = await getProfile(profileId);
    const contactInfo = await getContactInfo(profileId);
    
    // console.log("profile: ", publicProfile);

    console.log("contact info: ", contactInfo);

    const fullName = publicProfile.profile.firstName + " " + publicProfile.profile.lastName;
    const phoneNumber = getBestPhoneNumber(contactInfo?.phoneNumbers)?.number;
    const emailAddress = contactInfo?.emailAddress;
    const profileUrl = `https://www.linkedin.com/in/${profileId}/`;

    // console.log(phoneNuber);

    const experiences = publicProfile.positionView.elements;
    let company = undefined;
    let title = undefined;

    if (experiences.length > 0) {
        company = experiences[0].companyName;
        title = experiences[0].title;
    }

    payload = {
        fullName: fullName ?? '',
        phoneNumber: phoneNumber ?? '',
        emailAddress: emailAddress ?? '',
        profileUrl: profileUrl ?? '',
        company: company ?? '',
        title: title ?? '',
        status: "SMS à envoyer",
        comments: "Ajouté via l’extension chrome",
        owner,
        projects,
        acquisitions
    };

    return payload;
}

const handleGetRecruiterProfile = async (recruiter) => {
    const recruiterPublicProfile = await getProfile(recruiter.profileUrn);
    const publicIdentifier = recruiterPublicProfile?.profile?.miniProfile?.publicIdentifier;

    console.log("Phone Number: ", cleanRecruiterPhoneNumber(recruiter.contactPhone));
    
    recruiter = { 
        ...recruiter, 
        contactPhone: cleanRecruiterPhoneNumber(recruiter.contactPhone),
        profileUrl: `https://www.linkedin.com/in/${publicIdentifier}/`,
        status: "SMS à envoyer",
        comments: "Ajouté via l’extension chrome",
        owner
    };

    return recruiter;
}

const postRecruiter = async (recruiter) => {
    console.log("Recruiter to post: ", recruiter);

    const airtableResponse = await airtableAPIRequest(
        AIRTABLE_PROFILES_TABLE, 
        'POST', 
        {
            "fields": {
                "Nom": recruiter.fullName,
                "Téléphone": recruiter.phoneNumber,
                "Email": recruiter.emailAddress,
                "Acquisition": "Annonce Linkedin",
                "Profil" : recruiter.project,
                "Linkedin URL": recruiter.profileUrl,
                "Statut": recruiter.status,
                "Commentaires": recruiter.comments,
                "Owner": owner,
                "Mots Clés": recruiter.keyword === "" ? null : recruiter.keyword,
                "Repêché par quiz": recruiter.quiz
            },
            "typecast": true
        });

    console.log(airtableResponse);

    return airtableResponse;
}

const postPublicProfile = async (profile) => {
    console.log("Profile to post: ", profile);   
    
    const airtableResponse = await airtableAPIRequest(
        AIRTABLE_PROFILES_TABLE, 
        'POST', 
        {
            "fields": {
                "Nom": profile.fullName,
                "Téléphone": profile.phoneNumber !== undefined ? profile.phoneNumber : "",
                "Email": profile.emailAddress,
                "Entreprise": profile.company,
                "Titre" : profile.title,
                "URL Linkedin": profile.profileUrl,
                "Commentaires": profile.comments,
                "Owner": profile.owner,
                "Mots Clés": profile.keyword === "" ? null : profile.keyword,
                "Acquisition": profile.acquisition,
                "Projet": profile.project,
                "Statut": profile.status,
                "Repêché par quiz": profile.quiz,
            },
            "typecast": true
        });

    console.log(airtableResponse);

    return airtableResponse;
}

