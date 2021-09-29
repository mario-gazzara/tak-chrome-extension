
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

const getElementByAttribute = (attr, value, root) => {
    root = root || document.body;

    if(root.hasAttribute(attr) && root.getAttribute(attr) == value) {
        return root;
    }
    var children = root.children, element;

    for(var i = children.length; i--; ) {
        element = getElementByAttribute(attr, value, children[i]);
        if(element) {
            return element;
        }
    }
    return null;
}

const getProfileIdentifier = () => {
    var url = window.location.href;
    var paths = url.split('/');

    return paths.length > 1 ? paths[paths.length -2] : '';
}


const recruiterUrlMatches = (url) => {
    var patt = new RegExp("https:\/\/www.linkedin.com\/talent\/hire\/.+\/discover\/applicants\/profile\/.+");
    var res = patt.test(url);
    
    if (!res) return false;

    return true;
}
const wait = ms => new Promise(res => setTimeout(res, ms));