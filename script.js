const state = {
	mode: "cidr",
	lastValid: null,
};

//cache all the ui elements used by the calculator
const elements = {
	modeButtons: Array.from(document.querySelectorAll(".mode-switch__button")),
	inputField: document.querySelector('.field input[aria-describedby="ip-help"]'),
	prefixField: document.querySelector('.field input[aria-describedby="prefix-help"]'),
	maskField: document.querySelector('.field--hidden input'),
	ipHelp: document.getElementById("ip-help"),
	prefixHelp: document.getElementById("prefix-help"),
	inputPanelStatus: document.querySelector(".input-panel .status-pill"),
	resultsPanelStatus: document.querySelector(".results-panel .status-pill"),
	infoPanelStatus: document.querySelector(".info-panel .status-pill"),
	classificationValue: document.querySelector(".info-panel .info-card strong"),
	classificationDescription: document.querySelector(".info-panel .info-card p"),
	resultCards: Array.from(document.querySelectorAll(".result-card")),
	binaryIpRow: document.querySelector('.binary-block[data-binary-source="ip"] .binary-row'),
	binaryMaskRow: document.querySelector('.binary-block[data-binary-source="mask"] .binary-row'),
	binaryIpHint: document.querySelector('.binary-block[data-binary-source="ip"] .binary-hint'),
	binaryMaskHint: document.querySelector('.binary-block[data-binary-source="mask"] .binary-hint'),
};

// splits an ipv4 string into octets
function splitOctets(value) {
	return value.trim().split(".");
}

//validates ipv4 address and converts to octets
function parseIpv4(value) {
	if (typeof value !== "string") {
		return { ok: false, error: "Enter an IPv4 address." };
	}

	const octets = splitOctets(value);
	if (octets.length !== 4) {
		return { ok: false, error: "IPv4 addresses must contain four octets." };
	}

	const numbers = octets.map((octet) => {
		if (!/^\d+$/.test(octet)) {
			return Number.NaN;
		}

		return Number(octet);
	});

	if (numbers.some((number) => !Number.isInteger(number) || number < 0 || number > 255)) {
		return { ok: false, error: "Each IPv4 octet must be between 0 and 255." };
	}

	const intValue = numbers.reduce((accumulator, number) => (accumulator << 8) | number, 0) >>> 0;

	return { ok: true, value: numbers, intValue };
}

// validates the cidr prefix (whole number between 0 and 32)
function parsePrefix(value) {
	if (typeof value !== "string" || value.trim() === "") {
		return { ok: false, error: "Enter a CIDR prefix from 0 to 32." };
	}

	if (!/^\d+$/.test(value.trim())) {
		return { ok: false, error: "CIDR prefixes must be whole numbers." };
	}

	const prefix = Number(value);
	if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
		return { ok: false, error: "CIDR prefixes must be between 0 and 32." };
	}

	return { ok: true, value: prefix };
}

// converts the subnet mask to a 32 bit int
function prefixToMaskInt(prefix) {
	if (prefix === 0) {
		return 0;
	}

	return (0xffffffff << (32 - prefix)) >>> 0;
}

//converts a 32 bit integer into decimal ip v4
function intToIpv4(intValue) {
	return [
		(intValue >>> 24) & 255,
		(intValue >>> 16) & 255,
		(intValue >>> 8) & 255,
		intValue & 255,
	].join(".");
}

function maskIntToPrefix(maskInt) {
	let prefix = 0;
	let zeroSeen = false;

	for (let bit = 31; bit >= 0; bit -= 1) {
		const bitIsSet = ((maskInt >>> bit) & 1) === 1;
		if (bitIsSet) {
			if (zeroSeen) {
				return { ok: false, error: "Subnet masks must contain contiguous 1 bits." };
			}

			prefix += 1;
		} else {
			zeroSeen = true;
		}
	}

	return { ok: true, value: prefix };
}

//converts subnet mask to cidr prefix
function maskToPrefix(maskValue) {
	const maskParse = parseIpv4(maskValue);
	if (!maskParse.ok) {
		return { ok: false, error: "Enter a valid dotted-decimal subnet mask." };
	}

	const maskInt = maskParse.intValue;
	const prefixResult = maskIntToPrefix(maskInt);
	if (!prefixResult.ok) {
		return prefixResult;
	}

	return { ok: true, value: prefixResult.value, maskInt };
}

// Calculates the core subnet addresses for a validated IPv4 and prefix pair.
function calculateSubnetDetails({ ipInt, prefix }) {
	const maskInt = prefixToMaskInt(prefix);
	const wildcardInt = (~maskInt) >>> 0;
	const networkInt = (ipInt & maskInt) >>> 0;
	const broadcastInt = (networkInt | wildcardInt) >>> 0;

	return {
		maskInt,
		wildcardInt,
		networkInt,
		broadcastInt,
		mask: intToIpv4(maskInt),
		wildcard: intToIpv4(wildcardInt),
		network: intToIpv4(networkInt),
		broadcast: intToIpv4(broadcastInt),
	};
}

function calculateHostDetails({ subnet, prefix }) {
	const hostBits = 32 - prefix;
	const totalHosts = 2 ** hostBits;
	let usableHosts;
	let firstHostInt;
	let lastHostInt;

	if (prefix === 32) {
		usableHosts = 1;
		firstHostInt = subnet.networkInt;
		lastHostInt = subnet.networkInt;
	} else if (prefix === 31) {
		usableHosts = 2;
		firstHostInt = subnet.networkInt;
		lastHostInt = subnet.broadcastInt;
	} else {
		usableHosts = Math.max(totalHosts - 2, 0);
		firstHostInt = subnet.networkInt + 1;
		lastHostInt = subnet.broadcastInt - 1;
	}

	return {
		totalHosts,
		usableHosts,
		firstHostInt,
		lastHostInt,
		firstHost: intToIpv4(firstHostInt),
		lastHost: intToIpv4(lastHostInt),
	};
}

function classifyIpv4Address(ipInt) {
	if (ipInt === 0) {
		return {
			label: "Unspecified",
			description: "0.0.0.0 is the unspecified address and is used before an address is assigned.",
		};
	}

	if (ipInt >= 0x7f000000 && ipInt <= 0x7fffffff) {
		return {
			label: "Loopback",
			description: "127.0.0.0/8 is reserved for loopback traffic on the local machine.",
		};
	}

	if (ipInt >= 0xe0000000 && ipInt <= 0xefffffff) {
		return {
			label: "Multicast",
			description: "224.0.0.0/4 is reserved for multicast delivery.",
		};
	}

	if (ipInt >= 0x0a000000 && ipInt <= 0x0affffff) {
		return {
			label: "Private",
			description: "10.0.0.0/8 is a private address range.",
		};
	}

	if (ipInt >= 0xac100000 && ipInt <= 0xac1fffff) {
		return {
			label: "Private",
			description: "172.16.0.0/12 is a private address range.",
		};
	}

	if (ipInt >= 0xc0a80000 && ipInt <= 0xc0a8ffff) {
		return {
			label: "Private",
			description: "192.168.0.0/16 is a private address range.",
		};
	}

	if (ipInt >= 0xa9fe0000 && ipInt <= 0xa9feffff) {
		return {
			label: "Link-local",
			description: "169.254.0.0/16 is reserved for link-local addressing.",
		};
	}

	if (ipInt >= 0xf0000000) {
		return {
			label: "Reserved",
			description: "240.0.0.0/4 is reserved for future or experimental use.",
		};
	}

	return {
		label: "Public",
		description: "This IPv4 address does not fall into a reserved private or special-use range.",
	};
}

function renderAddressType(validationValue) {
	if (!elements.classificationValue || !elements.classificationDescription) {
		return;
	}

	if (!validationValue) {
		elements.infoPanelStatus.textContent = "Pending detection";
		elements.classificationValue.textContent = "Waiting for valid input";
		elements.classificationDescription.textContent = "Enter a valid IPv4 address to classify it as private, public, loopback, multicast, or another special-use range.";
		return;
	}

	const classification = classifyIpv4Address(validationValue.ipInt);
	elements.infoPanelStatus.textContent = classification.label;
	elements.classificationValue.textContent = classification.label;
	elements.classificationDescription.textContent = classification.description;
}

function intToBinaryOctets(intValue) {
	return [
		((intValue >>> 24) & 255).toString(2).padStart(8, "0"),
		((intValue >>> 16) & 255).toString(2).padStart(8, "0"),
		((intValue >>> 8) & 255).toString(2).padStart(8, "0"),
		(intValue & 255).toString(2).padStart(8, "0"),
	];
}

function renderBinaryRow(row, intValue, prefix) {
	if (!row) {
		return;
	}

	const bytes = intToBinaryOctets(intValue);
	const networkBytes = Math.floor(prefix / 8);
	const networkBits = prefix % 8;
	const fragment = document.createDocumentFragment();

	bytes.forEach((byte, index) => {
		const bit = document.createElement("span");
		bit.classList.add("binary-bit");

		if (index < networkBytes) {
			bit.classList.add("binary-bit--network");
			bit.textContent = byte;
		} else if (index > networkBytes || networkBits === 0) {
			bit.classList.add("binary-bit--host");
			bit.textContent = byte;
		} else {
			bit.classList.add("binary-bit--mixed");
			bit.innerHTML = `<span class="binary-bit__network-part">${byte.slice(0, networkBits)}</span><span class="binary-bit__host-part">${byte.slice(networkBits)}</span>`;
		}

		fragment.append(bit);
	});

	row.replaceChildren(fragment);
}

function renderBinaryBreakdown(validationValue) {
	if (!validationValue) {
		renderBinaryRow(elements.binaryIpRow, 0, 0);
		renderBinaryRow(elements.binaryMaskRow, 0, 0);
		if (elements.binaryIpHint) {
			elements.binaryIpHint.textContent = "Network bits and host bits will be color-coded later.";
		}
		if (elements.binaryMaskHint) {
			elements.binaryMaskHint.textContent = "The prefix will be mirrored here once parsing is wired up.";
		}
		return;
	}

	renderBinaryRow(elements.binaryIpRow, validationValue.ipInt, validationValue.prefix);
	renderBinaryRow(elements.binaryMaskRow, validationValue.maskInt, validationValue.prefix);
	if (elements.binaryIpHint) {
		elements.binaryIpHint.textContent = `Network bits cover the first ${validationValue.prefix} bits.`;
	}
	if (elements.binaryMaskHint) {
		elements.binaryMaskHint.textContent = `Subnet mask mirrors prefix /${validationValue.prefix}.`;
	}
}

function copyTextToClipboard(text) {
	if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
		return navigator.clipboard.writeText(text).then(() => true, () => false);
	}

	const helper = document.createElement("textarea");
	helper.value = text;
	helper.setAttribute("readonly", "true");
	helper.style.position = "fixed";
	helper.style.top = "-9999px";
	helper.style.left = "-9999px";
	document.body.append(helper);
	helper.select();
	helper.setSelectionRange(0, helper.value.length);

	let copied = false;
	try {
		copied = document.execCommand("copy");
	} catch {
		copied = false;
	}

	helper.remove();
	return Promise.resolve(copied);
}

function renderResults(validationValue) {
	const values = validationValue
		? [
			validationValue.subnet.network,
			validationValue.subnet.broadcast,
			`${validationValue.subnet.mask} / ${validationValue.prefix}`,
			validationValue.subnet.wildcard,
			String(validationValue.subnet.hosts.totalHosts),
			String(validationValue.subnet.hosts.usableHosts),
			validationValue.subnet.hosts.firstHost,
			validationValue.subnet.hosts.lastHost,
		]
		: ["—", "—", "—", "—", "—", "—", "—", "—"];

	elements.resultCards.forEach((card, index) => {
		const valueElement = card.querySelector("strong");
		if (valueElement) {
			valueElement.textContent = values[index];
		}
	});

	elements.resultsPanelStatus.textContent = validationValue
		? `Live results for ${intToIpv4(validationValue.ipInt)} / ${validationValue.prefix}`
		: "Waiting for valid input";
}

function setupResultCardCopyActions() {
	elements.resultCards.forEach((card) => {
		if (card.querySelector(".result-card__copy")) {
			return;
		}

		const labelElement = card.querySelector(".result-label");
		const label = labelElement ? labelElement.textContent.trim() : "value";
		const copyButton = document.createElement("button");
		copyButton.type = "button";
		copyButton.className = "result-card__copy";
		copyButton.textContent = "Copy";
		copyButton.setAttribute("aria-label", `Copy ${label}`);

		copyButton.addEventListener("click", async () => {
			const valueElement = card.querySelector("strong");
			const copiedValue = valueElement ? valueElement.textContent.trim() : "";
			if (!copiedValue || copiedValue === "—") {
				return;
			}

			const copied = await copyTextToClipboard(copiedValue);
			setStatus(copied ? `${label} copied` : "Copy failed", !copied);
		});

		card.append(copyButton);
	});
}

//validates the inputs to normalize the result
function buildValidationResult({ ipValue, prefixValue, maskValue, mode }) {
	const ipParse = parseIpv4(ipValue);
	if (!ipParse.ok) {
		return { ok: false, error: ipParse.error };
	}

	let prefixParse;
	let maskParse;

	if (mode === "cidr") {
		prefixParse = parsePrefix(prefixValue);
		if (!prefixParse.ok) {
			return { ok: false, error: prefixParse.error };
		}

		maskParse = { ok: true, value: intToIpv4(prefixToMaskInt(prefixParse.value)) };
	} else {
		maskParse = maskToPrefix(maskValue);
		if (!maskParse.ok) {
			return { ok: false, error: maskParse.error };
		}

		prefixParse = { ok: true, value: maskParse.value };
	}

	return {
		ok: true,
		value: {
			mode,
			ip: ipParse.value,
			ipInt: ipParse.intValue,
			prefix: prefixParse.value,
			mask: mode === "cidr" ? maskParse.value : maskValue.trim(),
			maskInt: prefixToMaskInt(prefixParse.value),
			subnet: (() => {
				const subnet = calculateSubnetDetails({ ipInt: ipParse.intValue, prefix: prefixParse.value });
				return {
					...subnet,
					hosts: calculateHostDetails({ subnet, prefix: prefixParse.value }),
				};
			})(),
		},
	};
}

function setStatus(message, isError = false) {
	elements.inputPanelStatus.textContent = message;
	elements.inputPanelStatus.style.color = isError ? "var(--pine)" : "var(--sage)";
}

function setFieldState(field, message, isError) {
	field.textContent = message;
	field.style.color = isError ? "var(--sage)" : "var(--muted)";
}

function updateVisibleMode() {
	const cidrActive = state.mode === "cidr";
	elements.modeButtons[0].classList.toggle("mode-switch__button--active", cidrActive);
	elements.modeButtons[0].setAttribute("aria-pressed", String(cidrActive));
	elements.modeButtons[1].classList.toggle("mode-switch__button--active", !cidrActive);
	elements.modeButtons[1].setAttribute("aria-pressed", String(!cidrActive));
	elements.prefixField.closest(".field").classList.toggle("field--hidden", !cidrActive);
	elements.maskField.closest(".field").classList.toggle("field--hidden", cidrActive);
	elements.prefixField.tabIndex = cidrActive ? 0 : -1;
	elements.maskField.tabIndex = cidrActive ? -1 : 0;
}

function validateAndReport() {
	const validation = buildValidationResult({
		ipValue: elements.inputField.value,
		prefixValue: elements.prefixField.value,
		maskValue: elements.maskField.value,
		mode: state.mode,
	});

	if (!validation.ok) {
		setStatus("Fix the highlighted input.", true);
		setFieldState(elements.ipHelp, validation.error, true);
		setFieldState(elements.prefixHelp, state.mode === "cidr" ? "Use a value between 0 and 32." : "Enter a valid dotted-decimal mask.", false);
		renderResults(null);
		renderBinaryBreakdown(null);
		renderAddressType(null);
		state.lastValid = null;
		return validation;
	}

	const { prefix, mask } = validation.value;
	setStatus(`Parsed ${intToIpv4(validation.value.ipInt)} / ${prefix}`);
	setFieldState(elements.ipHelp, `IP address accepted: ${intToIpv4(validation.value.ipInt)}`, false);
	setFieldState(elements.prefixHelp, `Subnet mask: ${mask} (${prefix})`, false);
	renderResults(validation.value);
	renderBinaryBreakdown(validation.value);
	renderAddressType(validation.value);
	state.lastValid = validation.value;
	return validation;
}

function syncMaskFromPrefix(prefix) {
	elements.maskField.value = intToIpv4(prefixToMaskInt(prefix));
}

function syncPrefixFromMask(maskValue) {
	const result = maskToPrefix(maskValue);
	if (result.ok) {
		elements.prefixField.value = String(result.value);
	}
}

function getParsedPrefixOrFallback(prefixValue, fallbackValue) {
	const parsedPrefix = parsePrefix(prefixValue);
	return parsedPrefix.ok ? parsedPrefix.value : fallbackValue;
}

elements.modeButtons.forEach((button, index) => {
	button.addEventListener("click", () => {
		state.mode = index === 0 ? "cidr" : "mask";
		updateVisibleMode();
		if (state.mode === "cidr") {
			syncMaskFromPrefix(getParsedPrefixOrFallback(elements.prefixField.value, 24));
		} else {
			syncPrefixFromMask(elements.maskField.value);
		}
		validateAndReport();
	});
});

elements.inputField.addEventListener("input", () => {
	validateAndReport();
});

elements.prefixField.addEventListener("input", () => {
	if (state.mode === "cidr") {
		syncMaskFromPrefix(getParsedPrefixOrFallback(elements.prefixField.value, 0));
	}
	validateAndReport();
});

elements.maskField.addEventListener("input", () => {
	if (state.mode === "mask") {
		syncPrefixFromMask(elements.maskField.value);
	}
	validateAndReport();
});

setupResultCardCopyActions();
updateVisibleMode();
validateAndReport();
