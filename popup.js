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

chrome.storage.local.get(({ 
	oldOwner, 
	oldProjects,
	oldAcquisitions }) => { 
    if (oldOwner) {
        document.getElementById('owner').value = oldOwner;
    }

	const projectsList = document.getElementById('projects');

	oldProjects?.forEach(p => {
		projectsList.innerHTML += `<li>${p}</li>`;
	})

	const acquisitionsList = document.getElementById('acquisitions');

	oldAcquisitions?.forEach(a => {
		acquisitionsList.innerHTML += `<li>${a}</li>`;
	})
})

const form = document.getElementById('popup-form');

const ONWNER_REQUIRED = "Please enter owner";

form.addEventListener("submit", (event) => {
	event.preventDefault();

	let ownerValid = hasValue(form.elements["owner"], ONWNER_REQUIRED);
	
	let projects = [];
	let acquisitions = [];


	const projectsList = document.getElementById('projects');
	const acquisitionsList = document.getElementById('acquisitions');

	console.log("projectList", projectsList);
	console.log("acquisitionList: ", acquisitionsList)

	projectsList.childNodes?.forEach(node => {
		if (node?.innerText !== undefined) projects.push(node.innerText);
	});

	acquisitionsList.childNodes?.forEach(node => {
		if (node?.innerText !== undefined) acquisitions.push(node.innerText);
	});

	console.log("Projects: ", projects);
	console.log("Acquisitions: ", acquisitions);

	if (ownerValid) {
		console.log("owner value: ", form.elements["owner"].value);
	
        chrome.storage.local.set({ oldOwner: form.elements["owner"].value });
		chrome.storage.local.set({ oldProjects: projects })
		chrome.storage.local.set({ oldAcquisitions: acquisitions });

        port.postMessage({ 
			owner: form.elements["owner"].value,
			projects,
			acquisitions
		});
	}
});

const addProjectButton = document.getElementById('project-button');

addProjectButton.addEventListener("click", (event) => {
	event.preventDefault();

	const project = document.getElementById('project').value;

	const projectsList = document.getElementById('projects');

	projectsList.innerHTML += `<li>${project}</li>`; 
});

const addAcquisitionButton = document.getElementById('acquisition-button');

addAcquisitionButton.addEventListener("click", (event) => {
	event.preventDefault();

	const acquisition = document.getElementById('acquisition').value;

	const acquisitionsList = document.getElementById('acquisitions');

	acquisitionsList.innerHTML += `<li>${acquisition}</li>`;
});

const clearProject = document.getElementById('clear-project');
const clearAcquisition = document.getElementById('clear-acquisition');

clearProject.addEventListener("click", () => {
	const projectsList = document.getElementById('projects');
	projectsList.innerHTML = "";
});

clearAcquisition.addEventListener("click", () => {
	const acquisitionsList = document.getElementById('acquisitions');
	acquisitionsList.innerHTML = "";
});