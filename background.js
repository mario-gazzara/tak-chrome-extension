const LINKEDIN_BASE_URL = 'https://www.linkedin.com';
const LINKEDIN_API_URL = `${LINKEDIN_BASE_URL}/voyager/api`;

const AIRTABLE_API_URL = "https://api.airtable.com/v0/appTZexPXpkZv2hLx";
const AIRTABLE_API_KEY = "keyCfydEMoBPBkBij";

const ACTIONS = {
    ADD_TO_MATCHING: 'add-to-matching'
};

chrome.runtime.onMessage.addListener(message => {
   switch (message.action) {
       case ACTIONS.ADD_TO_MATCHING:
           console.log("Adding profile to matching...");

           (async () => await handleAddProfileToMatching(message.data.profileId))();       

           return true;
   }  
});

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
        headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` },
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

const handleAddProfileToMatching = async (profileId) => {
    const profile = await getProfile(profileId);
    
    console.log("profile: ", profile);

    // const profilesTable = await airtableAPIRequest(`${AIRTABLE_API_URL}/Profils `, 'GET');

    // console.log("Profiles Table: ", profilesTable);
}

