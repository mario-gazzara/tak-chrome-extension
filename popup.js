function showMessage(input, message, type) {
	const msg = input.parentNode.querySelector("small");
	msg.innerText = message;
	
	input.className = type ? "success" : "error";

	return type;
}

function showError(input, message) {
	return showMessage(input, message, false);
}

function showSuccess(input) {
	return showMessage(input, "", true);
}

function hasValue(input, message) {
	if (input.value.trim() === "") {
		return showError(input, message);
	}
	return showSuccess(input);
}


var port = chrome.extension.connect({
    name: "Popup Communication"
});

chrome.storage.local.get(({ oldOwner }) => { 
    if (oldOwner) {
        document.getElementById('owner').value = oldOwner;
    }
})

const form = document.getElementById('popup-form');

const ONWNER_REQUIRED = "Please enter owner";

form.addEventListener("submit", (event) => {
	event.preventDefault();

	let ownerValid = hasValue(form.elements["owner"], ONWNER_REQUIRED);

	if (ownerValid) {
		console.log("owner value: ", form.elements["owner"].value);

        chrome.storage.local.set({ oldOwner: form.elements["owner"].value });

        port.postMessage({ owner: form.elements["owner"].value });
	}
});

