
const waitForElement = (targetNode, selector) => {
    return new Promise(resolve => {
        if (targetNode.querySelector(selector)) {
            return resolve(targetNode.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (targetNode.querySelector(selector)) {
                resolve(targetNode.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(targetNode, {
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
    var patt1 = new RegExp("https:\/\/www.linkedin.com\/talent\/profile\/.+");

    var res = patt.test(url);
    var res1 = patt1.test(url);
    
    console.log("search: ", res1); 
    console.log("from recruiter: ", res);

    if (!res && !res1) return false;

    return true;
}

const wait = ms => new Promise(res => setTimeout(res, ms));