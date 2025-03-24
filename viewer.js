// Configuration de Supabase
const SUPABASE_URL = '';
const SUPABASE_KEY = '';

// Variables globales
let currentProject = null;
let currentFrame = null;
let currentElement = null;
let elementsMap = {};

// Éléments DOM
const projectTitle = document.getElementById('project-title');
const loadingElement = document.getElementById('loading');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');
const projectContent = document.getElementById('project-content');
const framesList = document.getElementById('frames-list');
const framePreview = document.getElementById('frame-preview');
const canvas = document.getElementById('canvas');
const specsPanel = document.getElementById('specs-panel');
const elementName = document.getElementById('element-name');
const elementWidth = document.getElementById('element-width');
const elementHeight = document.getElementById('element-height');
const elementX = document.getElementById('element-x');
const elementY = document.getElementById('element-y');
const elementColorPreview = document.getElementById('element-color-preview');
const elementColor = document.getElementById('element-color');
const elementOpacity = document.getElementById('element-opacity');
const elementFont = document.getElementById('element-font');
const elementFontSize = document.getElementById('element-font-size');
const elementFontWeight = document.getElementById('element-font-weight');
const textPropertiesSection = document.getElementById('text-properties-section');
const cssCode = document.getElementById('css-code');
const copyCssButton = document.getElementById('copy-css-button');

// Au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  console.log("Chargement de la page...");
  
  // Récupérer l'ID du projet depuis l'URL
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('projectId');
  
  if (!projectId) {
    showError('Aucun ID de projet spécifié dans l\'URL');
    return;
  }

  console.log("ID du projet:", projectId);

  const header = document.querySelector('header');
  const refreshButton = document.createElement('button');
  refreshButton.textContent = 'Rafraîchir';
  refreshButton.className = 'refresh-button';
  refreshButton.style.marginLeft = 'auto'; // Pour placer le bouton à droite
  refreshButton.style.padding = '8px 16px';
  refreshButton.style.borderRadius = '4px';
  refreshButton.style.border = 'none';
  refreshButton.style.backgroundColor = '#18a0fb';
  refreshButton.style.color = 'white';
  refreshButton.style.cursor = 'pointer';
  
  refreshButton.addEventListener('click', () => {
    // Recharger la page
    location.reload();
  });

  header.appendChild(refreshButton);
  
  // Charger le projet
  loadProject(projectId);
});

// Fonction pour charger un projet depuis Supabase
async function loadProject(projectId) {
  try {
    console.log("Chargement du projet:", projectId);
    
    // 1. Récupérer les informations du projet
    const projectResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?id=eq.${projectId}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    
    const projects = await projectResponse.json();
    console.log("Données du projet:", projects);
    
    if (projects.length === 0) {
      throw new Error('Projet non trouvé');
    }
    
    currentProject = projects[0];
    projectTitle.textContent = currentProject.name;
    
    // 2. Récupérer les frames du projet
    try {
      console.log("Récupération des frames pour le projet:", projectId);
      
      const framesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/frames?project_id=eq.${projectId}&select=*`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );
      
      const frames = await framesResponse.json();
      console.log("Frames récupérées:", frames);
      
      // 3. Gérer le cas où il n'y a pas encore de frames
      if (frames.length === 0) {
        // Afficher un message d'attente
        const waitingMessage = document.createElement('div');
        waitingMessage.className = 'waiting-message';
        waitingMessage.innerHTML = `
          <div class="info-box">
            <h3>Projet créé avec succès!</h3>
            <p>Les frames n'ont pas encore été sauvegardées ou sont en cours de traitement.</p>
            <p>Vous pouvez rafraîchir la page dans quelques instants pour voir si les frames sont disponibles.</p>
          </div>
        `;
        
        // Masquer le chargement et afficher le message
        loadingElement.style.display = 'none';
        document.getElementById('main-container').appendChild(waitingMessage);
        return;
      }
      
      // 4. Si des frames sont disponibles, les afficher normalement
      renderFramesList(frames);
      
      // Masquer le chargement et afficher le contenu
      loadingElement.style.display = 'none';
      projectContent.style.display = 'flex';
      
    } catch (error) {
      console.error('Erreur lors du chargement des frames:', error);
      throw new Error('Impossible de charger les frames: ' + error.message);
    }
  } catch (error) {
    console.error('Erreur:', error);
    showError(error.message);
  }
}

// Fonction pour afficher une erreur
function showError(message) {
  console.error("Erreur affichée:", message);
  loadingElement.style.display = 'none';
  errorContainer.style.display = 'block';
  errorMessage.textContent = message;
}

// Fonction pour générer la liste des frames
function renderFramesList(frames) {
  framesList.innerHTML = '';
  
  if (frames.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Aucune frame disponible';
    framesList.appendChild(li);
    return;
  }
  
  frames.forEach((frame, index) => {
    const li = document.createElement('li');
    li.className = 'frame-item';
    li.textContent = frame.name;
    li.dataset.frameIndex = index.toString();
    
    li.addEventListener('click', () => {
      document.querySelectorAll('.frame-item').forEach(item => {
        item.classList.remove('active');
      });
      li.classList.add('active');
      loadFrame(frame);
    });
    
    framesList.appendChild(li);
  });
  
  // Charger la première frame par défaut
  if (frames.length > 0) {
    framesList.querySelector('.frame-item').classList.add('active');
    loadFrame(frames[0]);
  }
}

// Fonction pour charger une frame
// Fonction pour charger une frame
async function loadFrame(frame) {
  console.log("Chargement de la frame:", frame);
  
  currentFrame = frame;
  elementsMap = {};
  
  // Définir les dimensions de la frame
  framePreview.style.width = `${frame.width}px`;
  framePreview.style.height = `${frame.height}px`;
  
  // Charger l'image si disponible
  if (frame.image_data) {
    framePreview.innerHTML = `<img src="data:image/png;base64,${frame.image_data}" alt="${frame.name}" width="${frame.width}" height="${frame.height}">`;
  } else {
    framePreview.innerHTML = `<div class="no-image" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background-color:#f0f0f0;">Image non disponible</div>`;
  }
  
  try {
    // Récupérer les éléments de cette frame depuis Supabase
    console.log("Récupération des éléments pour la frame:", frame.id);
    
    const elementsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/elements?frame_id=eq.${frame.id}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    
    const elements = await elementsResponse.json();
    console.log("Éléments récupérés:", elements);
    
    // Ajouter les éléments sélectionnables
    if (elements && Array.isArray(elements)) {
      elements.forEach(element => {
        const div = document.createElement('div');
        div.className = 'selectable-element';
        div.dataset.elementId = element.id;
        div.style.left = `${element.x}px`;
        div.style.top = `${element.y}px`;
        div.style.width = `${element.width}px`;
        div.style.height = `${element.height}px`;
        
        div.addEventListener('click', (e) => {
          e.stopPropagation();
          selectElement(element);
        });
        
        framePreview.appendChild(div);
        elementsMap[element.id] = element;
      });
    } else {
      console.warn("Aucun élément trouvé ou format de données invalide");
      const noElementsDiv = document.createElement('div');
      noElementsDiv.className = 'no-elements';
      noElementsDiv.textContent = "Aucun élément trouvé pour cette frame";
      noElementsDiv.style.position = "absolute";
      noElementsDiv.style.top = "10px";
      noElementsDiv.style.left = "10px";
      noElementsDiv.style.padding = "5px";
      noElementsDiv.style.backgroundColor = "rgba(255,255,255,0.8)";
      framePreview.appendChild(noElementsDiv);
    }
    
  } catch (error) {
    console.error('Erreur lors du chargement des éléments:', error);
    // Afficher un message d'erreur pour l'utilisateur
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = "Impossible de charger les éléments de cette frame.";
    errorDiv.style.position = "absolute";
    errorDiv.style.top = "10px";
    errorDiv.style.left = "10px";
    errorDiv.style.padding = "10px";
    errorDiv.style.backgroundColor = "rgba(255,0,0,0.2)";
    framePreview.appendChild(errorDiv);
  }
  
  // Réinitialiser la sélection
  currentElement = null;
  updateElementSpecs(null);
  
  // Centrer la frame dans le canvas
  centerFrameInCanvas();
}

// Fonction pour centrer la frame dans le canvas
function centerFrameInCanvas() {
  if (!currentFrame) return;
  
  const canvasWidth = canvas.clientWidth;
  const canvasHeight = canvas.clientHeight;
  const frameWidth = currentFrame.width;
  const frameHeight = currentFrame.height;
  
  // Calculer le zoom pour adapter la frame à la vue, si nécessaire
  const scale = Math.min(1, (canvasHeight - 80) / frameHeight, (canvasWidth - 80) / frameWidth);
  
  // Appliquer le zoom seulement si la frame est trop grande
  if (scale < 1) {
    framePreview.style.transform = `scale(${scale})`;
    framePreview.style.transformOrigin = 'top left';
  } else {
    framePreview.style.transform = '';
  }
}

// Fonction pour sélectionner un élément
function selectElement(element) {
  console.log("Élément sélectionné:", element);
  
  currentElement = element;
  
  // Mettre à jour l'apparence des éléments
  document.querySelectorAll('.selectable-element').forEach(el => {
    el.classList.remove('selected');
  });
  
  if (element) {
    const selectedElement = document.querySelector(`.selectable-element[data-element-id="${element.id}"]`);
    if (selectedElement) {
      selectedElement.classList.add('selected');
    }
  }
  
  updateElementSpecs(element);
}

// Fonction pour mettre à jour les specs d'un élément
function updateElementSpecs(element) {
  if (!element) {
    elementName.textContent = 'Aucun élément sélectionné';
    elementWidth.textContent = '-';
    elementHeight.textContent = '-';
    elementX.textContent = '-';
    elementY.textContent = '-';
    elementColor.textContent = '-';
    elementColorPreview.style.backgroundColor = 'white';
    elementOpacity.textContent = '-';
    textPropertiesSection.style.display = 'none';
    cssCode.textContent = 'Sélectionnez un élément pour voir le code';
    return;
  }
  
  // Informations de base
  elementName.textContent = element.name || 'Élément sans nom';
  elementWidth.textContent = `${element.width || 0}px`;
  elementHeight.textContent = `${element.height || 0}px`;
  elementX.textContent = `${element.x || 0}px`;
  elementY.textContent = `${element.y || 0}px`;
  
  // Couleurs
  elementColor.textContent = element.color || '-';
  elementColorPreview.style.backgroundColor = element.color || 'transparent';
  elementOpacity.textContent = element.opacity !== undefined ? element.opacity.toString() : '-';
  
  // Propriétés de texte
  if (element.type === 'TEXT') {
    textPropertiesSection.style.display = 'block';
    elementFont.textContent = element.font_family || '-';
    elementFontSize.textContent = element.font_size ? `${element.font_size}px` : '-';
    elementFontWeight.textContent = element.font_weight || '-';
  } else {
    textPropertiesSection.style.display = 'none';
  }
  
  // Générer le code CSS
  generateCssCode(element);
}

// Fonction pour générer le code CSS
function generateCssCode(element) {
  // Créer un nom de classe CSS valide à partir du nom de l'élément
  const className = element.name ? element.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : 'element';
  
  let css = `.${className} {\n`;
  css += `  width: ${element.width}px;\n`;
  css += `  height: ${element.height}px;\n`;
  
  if (element.color) {
    css += `  background-color: ${element.color};\n`;
  }
  
  if (element.opacity !== undefined && element.opacity < 1) {
    css += `  opacity: ${element.opacity};\n`;
  }
  
  if (element.type === 'TEXT') {
    if (element.font_family) {
      css += `  font-family: ${element.font_family};\n`;
    }
    if (element.font_size) {
      css += `  font-size: ${element.font_size}px;\n`;
    }
    if (element.font_weight) {
      css += `  font-weight: ${element.font_weight};\n`;
    }
  }
  
  css += `}`;
  
  cssCode.textContent = css;
}

// Fonction pour copier le CSS
copyCssButton.addEventListener('click', () => {
  if (!currentElement) return;
  
  navigator.clipboard.writeText(cssCode.textContent)
    .then(() => {
      const originalText = copyCssButton.textContent;
      copyCssButton.textContent = 'Copié!';
      setTimeout(() => {
        copyCssButton.textContent = originalText;
      }, 2000);
    })
    .catch(err => {
      console.error('Erreur lors de la copie: ', err);
    });
});

// Gestion du redimensionnement de la fenêtre
window.addEventListener('resize', centerFrameInCanvas);
