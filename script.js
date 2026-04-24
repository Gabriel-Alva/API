// Diccionario de traducción movido al Frontend para que funcione en GitHub Pages
const spanishToEnglishDictionary = {
    "oro": "gold", "hidrogeno": "hydrogen", "hidrógeno": "hydrogen",
    "oxigeno": "oxygen", "oxígeno": "oxygen", "carbono": "carbon",
    "nitrogeno": "nitrogen", "nitrógeno": "nitrogen", "hierro": "iron",
    "cobre": "copper", "plata": "silver", "plomo": "lead",
    "azufre": "sulfur", "calcio": "calcium", "sodio": "sodium",
    "potasio": "potassium", "magnesio": "magnesium", "aluminio": "aluminum",
    "zinc": "zinc", "estaño": "tin", "mercurio": "mercury",
    "niquel": "nickel", "níquel": "nickel", "helio": "helium",
    "neon": "neon", "neón": "neon", "argon": "argon", "argón": "argon",
    "dioxido de carbono": "carbon dioxide", "dióxido de carbono": "carbon dioxide",
    "agua": "water", "glucosa": "glucose", "sal": "sodium chloride",
    "h": "hydrogen", "o": "oxygen", "c": "carbon" // Añadidas letras sueltas por si acaso
};

// --- FUNCIONES NUEVAS AÑADIDAS PARA EVITAR ERRORES ---

// Función para calcular los moles dinámicamente
function calculateMoles(grams, molecularWeight, resultElementId) {
    const resultSpan = document.getElementById(resultElementId);
    if (grams && !isNaN(grams) && parseFloat(grams) >= 0) {
        const moles = parseFloat(grams) / parseFloat(molecularWeight);
        resultSpan.textContent = moles.toFixed(4);
    } else {
        resultSpan.textContent = "0.0000";
    }
}

// Función placeholder para el glosario
function addToStudyGlossary(title, formula, description) {
    // Si más adelante quieres agregar los elementos a una lista en el HTML, el código iría aquí.
    // Por ahora, solo lo registra en la consola para que no arroje error.
    console.log(`Guardado en el glosario: ${title} (${formula})`);
}

// -----------------------------------------------------

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
        // 1. Traducción LOCAL usando el diccionario (Adiós api.php)
        const queryLower = queryText.toLowerCase();
        const compoundName = spanishToEnglishDictionary[queryLower] || queryLower;

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

        // 3. Consultar MyMemory (Con límite estricto para evitar el error de 500 chars)
        const MAX_TRANS_LENGTH = 400; // Reducido a 400 para estar seguros con la API gratuita
        const textToTranslate = engDescription.length > MAX_TRANS_LENGTH ? engDescription.substring(0, MAX_TRANS_LENGTH) + "..." : engDescription;
        let spaDescription = textToTranslate; 
        let spaTitle = engTitle; 

        try {
            const translateUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=en|es`;
            const transDescRes = await fetch(translateUrl);
            if (transDescRes.ok) {
                const transData = await transDescRes.json();
                if(transData.responseStatus === 200) {
                    spaDescription = transData.responseData.translatedText;
                }
            }

            const transTitleRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(engTitle)}&langpair=en|es`);
            if (transTitleRes.ok) {
                const titleData = await transTitleRes.json();
                 if(titleData.responseStatus === 200) {
                    spaTitle = titleData.responseData.translatedText;
                 }
            }
        } catch (e) {
            console.warn("MyMemory API falló, mostrando en inglés.");
        }

        // 4. Renderizar resultados
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

// Asegúrate de poner esto al final de tu script.js
document.addEventListener('DOMContentLoaded', () => {
    // Reemplaza 'searchBtn' con el ID real que tenga tu botón en el HTML
    // Si tu botón no tiene ID, ponle uno en tu index.html, por ejemplo: id="btnBuscar"
    const btnBuscar = document.querySelector('button'); 
    const inputField = document.getElementById('compoundInput');

    // Ejecutar al hacer clic en el botón
    if (btnBuscar) {
        btnBuscar.addEventListener('click', fetchCompoundData);
    }

    // Ejecutar al presionar la tecla "Enter"
    if (inputField) {
        inputField.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                fetchCompoundData();
            }
        });
    }
});
