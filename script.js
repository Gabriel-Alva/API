// Listeners de eventos
document.getElementById('searchBtn').addEventListener('click', fetchCompoundData);
document.getElementById('compoundInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') fetchCompoundData();
});

// Calculadora de moles
window.calculateMoles = function(grams, molecularWeight, resultElementId) {
    const resultSpan = document.getElementById(resultElementId);
    if (!grams || isNaN(grams) || grams <= 0) {
        resultSpan.innerText = "0.0000";
        return;
    }
    const moles = parseFloat(grams) / parseFloat(molecularWeight);
    resultSpan.innerText = moles.toFixed(4);
};

async function fetchCompoundData() {
    const inputField = document.getElementById('compoundInput');
    const queryText = inputField.value.trim();
    const resultContainer = document.getElementById('resultContainer');

    if (!queryText) {
        alert("Por favor, ingresa el nombre de un compuesto o elemento.");
        return;
    }

    resultContainer.innerHTML = `
        <div class="state-message">
            <svg class="icon spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <span>Analizando y conectando con los servidores...</span>
        </div>`;

    try {
        // 1. Consultar a NUESTRO backend (PHP) para la traducción al inglés
        const phpResponse = await fetch(`api.php?q=${encodeURIComponent(queryText)}`);
        if (!phpResponse.ok) throw new Error("Error conectando con nuestro servidor local (api.php).");
        
        const phpData = await phpResponse.json();
        const compoundName = phpData.translatedToEnglish;

        // 2. Consultar a PubChem
        const descUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(compoundName)}/description/JSON`;
        const propsUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(compoundName)}/property/MolecularFormula,MolecularWeight/JSON`;

        const [descResponse, propsResponse] = await Promise.all([ fetch(descUrl), fetch(propsUrl) ]);
        
        if (!descResponse.ok && !propsResponse.ok) {
            throw new Error(`Compuesto "${queryText}" no encontrado en la base de datos de PubChem.`);
        }

        // Extracción de datos
        let engTitle = compoundName;
        let engDescription = "Sin descripción disponible.";
        let formula = "N/A";
        let molecularWeight = null;
        
        if (descResponse.ok) {
            const descData = await descResponse.json();
            const info = descData?.InformationList?.Information;
            if (info) {
                engTitle = info.find(item => item.Title)?.Title || compoundName;
                engDescription = info.find(item => item.Description)?.Description || engDescription;
            }
        }

        if (propsResponse.ok) {
            const propsData = await propsResponse.json();
            const props = propsData?.PropertyTable?.Properties[0];
            if (props) {
                formula = props.MolecularFormula || "N/A";
                molecularWeight = props.MolecularWeight || null;
            }
        }

        // 3. Consultar MyMemory para traducir de vuelta al español la descripción
        const MAX_TRANS_LENGTH = 480;
        const textToTranslate = engDescription.length > MAX_TRANS_LENGTH ? engDescription.substring(0, MAX_TRANS_LENGTH) + "..." : engDescription;
        let spaDescription = textToTranslate; 
        let spaTitle = engTitle; 

        try {
            const translateUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=en|es`;
            const transDescRes = await fetch(translateUrl);
            if (transDescRes.ok) spaDescription = (await transDescRes.json()).responseData.translatedText;

            const transTitleRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(engTitle)}&langpair=en|es`);
            if (transTitleRes.ok) spaTitle = (await transTitleRes.json()).responseData.translatedText;
        } catch (e) {
            console.warn("MyMemory API falló, mostrando en inglés.");
        }

        // 4. Renderizar resultados con Iconos SVG
        const uniqueId = Date.now();
        let calculatorHTML = '';
        
        if (molecularWeight) {
            calculatorHTML = `
                <div class="calculator-box">
                    <div class="calc-header">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="16" y1="18" x2="16" y2="18.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="12" y1="18" x2="12" y2="18.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="8" y1="18" x2="8" y2="18.01"/></svg>
                        <h4>Calculadora de Moles</h4>
                    </div>
                    <p class="calc-subtext">Peso Molecular: <strong>${molecularWeight} g/mol</strong></p>
                    <div class="calc-input-group">
                        <input type="number" step="0.01" min="0" placeholder="Gramos (g)" 
                            oninput="calculateMoles(this.value, ${molecularWeight}, 'result-${uniqueId}')">
                        <span class="calc-equals">→</span>
                        <span class="calc-result"><span id="result-${uniqueId}">0.0000</span> moles</span>
                    </div>
                </div>
            `;
        }

        resultContainer.innerHTML = `
            <div class="card fade-in">
                <div class="card-title-group">
                    <h3>${spaTitle}</h3>
                    <span class="formula-badge">${formula}</span>
                </div>
                <p class="description-text">${spaDescription}</p>
                ${calculatorHTML}
            </div>
        `;

        addToStudyGlossary(spaTitle, formula, spaDescription);
        inputField.value = '';

    } catch (error) {
        resultContainer.innerHTML = `
            <div class="state-message error">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>${error.message}</span>
            </div>`;
    }
}

function addToStudyGlossary(title, formula, description) {
    const studyList = document.getElementById('study-list');
    const listItem = document.createElement('li');
    listItem.className = "fade-in";
    const shortDescription = description.length > 120 ? description.substring(0, 120) + "..." : description;

    listItem.innerHTML = `
        <div class="glossary-item-header">
            <strong>${title}</strong> 
            <span class="formula-badge small">${formula}</span>
        </div>
        <p class="glossary-item-desc">${shortDescription}</p>
    `;
    studyList.insertBefore(listItem, studyList.firstChild);
}