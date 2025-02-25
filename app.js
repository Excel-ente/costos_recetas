let products = JSON.parse(localStorage.getItem('products')) || [];
let recipes = JSON.parse(localStorage.getItem('recipes')) || [];

/* ----------------------------------------------------
   Conversiones: Solo se permiten conversiones entre:
   - Kilos ⇄ Gramos  
   - Litros ⇄ Mililitros  
   - Onzas ⇄ Libras  
   - Metros ⇄ Centimetros  
   Los demás (Unidades, Mt2, Mt3) se consideran únicos.
------------------------------------------------------- */
const CONVERSION_GROUPS = {
  'Kilos': { 'Gramos': 1000 },
  'Gramos': { 'Kilos': 1/1000 },
  'Litros': { 'Mililitros': 1000 },
  'Mililitros': { 'Litros': 1/1000 },
  'Onzas': { 'Libras': 1/16 },
  'Libras': { 'Onzas': 16 },
  'Metros': { 'Centimetros': 100 },
  'Centimetros': { 'Metros': 1/100 },
};

// Función para formatear montos en moneda
function formatCurrency(amount) {
  return `$${parseFloat(amount).toFixed(2)}`;
}

// Calcula y muestra el costo unitario en el formulario de producto
function calculateUnitCost() {
  const quantity = parseFloat(document.getElementById('purchaseQuantity').value);
  const cost = parseFloat(document.getElementById('totalCost').value);
  if (quantity && cost) {
    document.getElementById('unitCost').textContent = formatCurrency(cost / quantity);
  }
}

// Función para convertir cantidades entre unidades convertibles
function convertUnit(value, fromUnit, toUnit) {
  if (fromUnit === toUnit) return value;
  if (CONVERSION_GROUPS[fromUnit] && CONVERSION_GROUPS[fromUnit][toUnit]) {
    return value * CONVERSION_GROUPS[fromUnit][toUnit];
  }
  throw new Error(`No se puede convertir de ${fromUnit} a ${toUnit}`);
}

// Retorna las unidades compatibles para un producto dado su unidad base.
function getCompatibleUnits(baseUnit) {
  if (CONVERSION_GROUPS[baseUnit]) {
    const group = new Set([baseUnit, ...Object.keys(CONVERSION_GROUPS[baseUnit])]);
    return Array.from(group);
  }
  for (const key in CONVERSION_GROUPS) {
    if (CONVERSION_GROUPS[key][baseUnit] !== undefined) {
      const group = new Set([baseUnit, key, ...Object.keys(CONVERSION_GROUPS[key])]);
      return Array.from(group);
    }
  }
  return [baseUnit];
}

/* =================== */
/* Gestión de Productos */
/* =================== */
function showProductModal(product = null) {
  const title = document.getElementById('productFormTitle');
  const form = document.getElementById('productForm');
  title.textContent = product ? 'Editar Producto' : 'Nuevo Producto';
  form.reset();
  if (product) {
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('purchaseUnit').value = product.unit;
    document.getElementById('purchaseQuantity').value = product.quantity;
    document.getElementById('totalCost').value = product.cost;
    calculateUnitCost();
  }
  document.getElementById('productModal').style.display = 'flex';
}

function closeProductModal() {
  document.getElementById('productModal').style.display = 'none';
}

function saveProduct(e) {
  e.preventDefault();
  
  const productData = {
    id: document.getElementById('productId').value || Date.now(),
    name: document.getElementById('productName').value,
    unit: document.getElementById('purchaseUnit').value,
    quantity: parseFloat(document.getElementById('purchaseQuantity').value),
    cost: parseFloat(document.getElementById('totalCost').value)
  };
  productData.unitCost = productData.cost / productData.quantity;
  
  const index = products.findIndex(p => p.id == productData.id);
  if (index >= 0) {
    products[index] = productData;
  } else {
    products.push(productData);
  }
  localStorage.setItem('products', JSON.stringify(products));
  displayProducts();
  closeProductModal();
}

function deleteProduct(id) {
  if (confirm('¿Está seguro de eliminar este producto?')) {
    products = products.filter(p => p.id != id);
    localStorage.setItem('products', JSON.stringify(products));
    displayProducts();
  }
}

function displayProducts() {
  const searchQuery = document.getElementById('productSearch').value.toLowerCase();
  const productsList = document.getElementById('productsList');
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery));
  productsList.innerHTML = filteredProducts.map(product => `
    <div class="item-card">
      <div class="item-header">
        <span class="item-title">${product.name}</span>
        <div class="item-actions">
          <button onclick='showProductModal(${JSON.stringify(product)})' class="btn-secondary">Editar</button>
          <button onclick="deleteProduct(${product.id})" class="btn-danger">Eliminar</button>
        </div>
      </div>
      <div>
        ${product.quantity} ${product.unit}<br>
        Costo Total: ${formatCurrency(product.cost)}<br>
        Costo Unitario: ${formatCurrency(product.unitCost)} / ${product.unit}
      </div>
    </div>
  `).join('');
}

/* =================== */
/* Gestión de Recetas  */
/* =================== */
function showRecipeModal(recipe = null) {
  const title = document.getElementById('recipeFormTitle');
  const form = document.getElementById('recipeForm');
  title.textContent = recipe ? 'Editar Receta' : 'Nueva Receta';
  form.reset();
  document.getElementById('ingredientsContainer').innerHTML = '';
  
  if (recipe) {
    document.getElementById('recipeId').value = recipe.id;
    document.getElementById('recipeName').value = recipe.name;
    document.getElementById('profitPercentage').value = recipe.profitPercentage || 0;
    document.getElementById('salePrice').value = recipe.salePrice || 0;
    recipe.ingredients.forEach(ing => addIngredientRow(ing));
  }
  
  
  document.getElementById('recipeModal').style.display = 'flex';
  updateRecipeTotalCost();
}

function closeRecipeModal() {
  document.getElementById('recipeModal').style.display = 'none';
}

function addIngredientRow(ingredient = null) {
  const container = document.createElement('div');
  container.className = 'ingredient-row';

  let product = null;
  if (ingredient) {
    product = products.find(p => p.id == ingredient.productId);
  }

  container.innerHTML = `
    <select class="ingredient-product form-select" required>
      <option value="">Seleccione un producto</option>
      ${products.map(p => `
        <option value="${p.id}" ${ingredient && p.id == ingredient.productId ? 'selected' : ''}>
          ${p.name} (${p.unit})
        </option>
      `).join('')}
    </select>
    <div class="ingredient-details">
      <input type="number" class="ingredient-quantity form-input" min="0.01" step="0.01" value="${ingredient ? ingredient.quantity : 1}" required>

      <select class="ingredient-unit form-select" required></select>
      <output class="ingredient-cost form-input">$0.00</output>
      <button type="button" class="btn-danger" onclick="this.parentElement.parentElement.remove(); updateRecipeTotalCost();">
        Eliminar
      </button>
    </div>
  `;

  const productSelect = container.querySelector('.ingredient-product');
  const unitSelect = container.querySelector('.ingredient-unit');

  function updateUnits(selectedUnit = null) {
    const selectedProduct = products.find(p => p.id == productSelect.value);
    if (selectedProduct) {
      unitSelect.innerHTML = getCompatibleUnits(selectedProduct.unit)
        .map(u => `<option value="${u}" ${selectedUnit === u ? 'selected' : ''}>${u}</option>`).join('');
    } else {
      unitSelect.innerHTML = '<option value="">Seleccione unidad</option>';
    }
  }

  // Actualizar unidades al cargar (importante)
  updateUnits(ingredient ? ingredient.unit : null);

  productSelect.addEventListener('change', () => {
    updateUnits();
    updateRecipeTotalCost();
  });

  container.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('change', updateRecipeTotalCost);
  });

  document.getElementById('ingredientsContainer').appendChild(container);
  updateRecipeTotalCost();
}

document.getElementById('calculationType').addEventListener('change', () => {
  const type = document.getElementById('calculationType').value;

  if (type === 'profit') {
    document.getElementById('profitPercentage').readOnly = false;
    document.getElementById('salePrice').readOnly = true;
  } else {
    document.getElementById('profitPercentage').readOnly = true;
    document.getElementById('salePrice').readOnly = false;
  }
  updateRecipeTotalCost();
});

document.getElementById('recalculateBtn').addEventListener('click', () => {
  updateRecipeTotalCost();
});



function saveRecipe(e) {
  e.preventDefault();
  
  const ingredients = [];
  let totalCost = 0;

  document.querySelectorAll('.ingredient-row').forEach(row => {
    const productId = row.querySelector('.ingredient-product').value;
    const quantity = parseFloat(row.querySelector('.ingredient-quantity').value);
    const unit = row.querySelector('.ingredient-unit').value;

    if (productId && quantity && unit) {
      const product = products.find(p => p.id == productId);
      const convertedQuantity = convertUnit(quantity, unit, product.unit);
      const cost = (convertedQuantity / product.quantity) * product.cost;
      ingredients.push({
        productId,
        productName: product.name,
        quantity,
        unit,
        cost
      });
      totalCost += cost;
    }
  });

  const calculationType = document.getElementById('calculationType').value;
  let profitPercentage, salePrice;

  if (calculationType === 'profit') {
    profitPercentage = parseFloat(document.getElementById('profitPercentage').value) || 0;
    salePrice = totalCost * (1 + profitPercentage / 100);
  } else {
    salePrice = parseFloat(document.getElementById('salePrice').value) || totalCost;
    profitPercentage = salePrice && totalCost ? ((salePrice / totalCost) - 1) * 100 : 0;
  }

  const manufactureTime = parseInt(document.getElementById('manufactureTime').value) || 0;

  const recipeData = {
    id: document.getElementById('recipeId').value || Date.now(),
    name: document.getElementById('recipeName').value,
    ingredients,
    totalCost,
    profitPercentage: profitPercentage.toFixed(2),
    salePrice: salePrice.toFixed(2),
    manufactureTime
  };

  const index = recipes.findIndex(r => r.id == recipeData.id);
  if (index >= 0) {
    recipes[index] = recipeData;
  } else {
    recipes.push(recipeData);
  }
  localStorage.setItem('recipes', JSON.stringify(recipes));
  displayRecipes();
  closeRecipeModal();
}



function updateRecipeTotalCost() {
  let totalCost = 0;
  document.querySelectorAll('.ingredient-row').forEach(row => {
    const productId = row.querySelector('.ingredient-product').value;
    const quantity = parseFloat(row.querySelector('.ingredient-quantity').value);
    const unit = row.querySelector('.ingredient-unit').value;
    const output = row.querySelector('.ingredient-cost');

    if (productId && quantity && unit) {
      const product = products.find(p => p.id == productId);
      try {
        const convertedQuantity = convertUnit(quantity, unit, product.unit);
        const cost = (convertedQuantity / product.quantity) * product.cost;
        totalCost += cost;
        output.textContent = formatCurrency(cost);
      } catch (error) {
        output.textContent = 'Error unidad';
      }
    } else {
      output.textContent = '$0.00';
    }
  });

  document.getElementById('recipeTotalCost').textContent = formatCurrency(totalCost);

  const calculationType = document.getElementById('calculationType').value;

  if (calculationType === 'profit') {
    const profit = parseFloat(document.getElementById('profitPercentage').value) || 0;
    const salePrice = totalCost * (1 + profit / 100);
    document.getElementById('salePrice').value = salePrice.toFixed(2);
  } else {
    const salePrice = parseFloat(document.getElementById('salePrice').value) || 0;
    const profitPercentage = salePrice && totalCost ? ((salePrice / totalCost) - 1) * 100 : 0;
    document.getElementById('profitPercentage').value = profitPercentage.toFixed(2);
  }

  document.getElementById('recipeTotalCost').textContent = formatCurrency(totalCost);
}



function saveRecipe(e) {
  e.preventDefault();
  
  const ingredients = [];
  let totalCost = 0;
  
  document.querySelectorAll('.ingredient-row').forEach(row => {
    const productId = row.querySelector('.ingredient-product').value;
    const quantity = parseFloat(row.querySelector('.ingredient-quantity').value);
    const unit = row.querySelector('.ingredient-unit').value;
    
    if (productId && quantity && unit) {
      const product = products.find(p => p.id == productId);
      const convertedQuantity = convertUnit(quantity, unit, product.unit);
      const cost = (convertedQuantity / product.quantity) * product.cost;
      ingredients.push({
        productId,
        productName: product.name,
        quantity,
        unit,
        cost
      });
      totalCost += cost;
    }
  });
  
  const profitPercentage = parseFloat(document.getElementById('profitPercentage').value) || 0;
  const salePrice = totalCost * (1 + profitPercentage / 100);
  
  const recipeData = {
    id: document.getElementById('recipeId').value || Date.now(),
    name: document.getElementById('recipeName').value,
    ingredients,
    totalCost,
    profitPercentage,
    salePrice: salePrice.toFixed(2)
  };
  
  const index = recipes.findIndex(r => r.id == recipeData.id);
  if (index >= 0) {
    recipes[index] = recipeData;
  } else {
    recipes.push(recipeData);
  }
  localStorage.setItem('recipes', JSON.stringify(recipes));
  displayRecipes();
  closeRecipeModal();
}

function deleteRecipe(id) {
  if (confirm('¿Está seguro de eliminar esta receta?')) {
    recipes = recipes.filter(r => r.id != id);
    localStorage.setItem('recipes', JSON.stringify(recipes));
    displayRecipes();
  }
}

function displayRecipes() {
  const searchQuery = document.getElementById('recipeSearch').value.toLowerCase();
  const recipesList = document.getElementById('recipesList');
  const filteredRecipes = recipes.filter(r => r.name.toLowerCase().includes(searchQuery));
  recipesList.innerHTML = filteredRecipes.map(recipe => `
    <div class="item-card">
      <div class="item-header">
        <span class="item-title">${recipe.name}</span>
        <div class="item-actions">
          <button onclick='generatePDF(${recipe.id})' class="btn-primary">PDF</button>
          <button onclick='showRecipeModal(${JSON.stringify(recipe)})' class="btn-secondary">Editar</button>
          <button onclick="deleteRecipe(${recipe.id})" class="btn-danger">Eliminar</button>
        </div>
      </div>
      <div>
        <strong>Ingredientes:</strong>
        <ul>
          ${recipe.ingredients.map(ing => `
            <li>${ing.quantity} ${ing.unit} de ${ing.productName} - ${formatCurrency(ing.cost)}</li>
          `).join('')}
        </ul>
        <strong>Costo Total: ${formatCurrency(recipe.totalCost)}</strong><br>
        <strong>% Ganancias:</strong> ${recipe.profitPercentage}%<br>
        <strong>Precio de Venta:</strong> ${formatCurrency(recipe.salePrice)}
      </div>
    </div>
  `).join('');
}

function generatePDF(recipeId) {
  const recipe = recipes.find(r => r.id == recipeId);
  if (!recipe) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  
  const margin = 40;
  let y = 60;

  // Logo
  const logo = new Image();
  logo.src = 'logo.png'; // Coloca el path correcto de tu logo

  logo.onload = () => {
    doc.addImage(logo, 'PNG', 450, 20, 100, 100);

    // Título principal
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(recipe.name, margin, y);
    y += 50;

    // Detalles de la receta
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Detalles:', margin, y);
    y += 20;

    doc.setFont('Helvetica', 'normal');

    doc.text(`Costo Total: ${formatCurrency(recipe.totalCost)}`, margin, y);
    y += 20;

    doc.text(`% Ganancias: ${recipe.profitPercentage}%`, margin, y);
    y += 20;

    doc.text(`Precio de Venta: ${formatCurrency(recipe.salePrice)}`, margin, y);
    y += 20;


    y += 10;

    // Ingredientes
    doc.setFont('Helvetica', 'bold');
    doc.text('Ingredientes:', margin, y);
    y += 20;

    recipe.ingredients.forEach(ing => {
      doc.setFont('Helvetica', 'bold');
      doc.text(`${ing.productName}`, margin, y);
      y += 15;

      doc.setFont('Helvetica', 'normal');
      doc.text(
        `Cantidad: ${ing.quantity} ${ing.unit} | Costo: ${formatCurrency(ing.cost)}`,
        margin + 10,
        y
      );
      y += 20;
    });

    y += 20;

    // Pie de página
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(margin, y, 550, y);
    y += 20;

    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(10);
    doc.text(
      'Generado por Excel-ente.com | Calculadora de Costos de Recetas',
      margin,
      y
    );

    doc.save(`receta-${recipe.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  logo.onerror = () => {
    alert('Error al cargar el logo.');
  };
}


/* =================== */
/* Exportar a XSLX     */
/* =================== */
function exportToExcel(data, filename, headers) {
  // Crear una matriz con la cabecera
  const worksheetData = [headers];
  // Agregar cada fila de datos
  data.forEach(item => {
    const row = headers.map(header => item[header] || '');
    worksheetData.push(row);
  });
  
  // Crear la hoja de trabajo a partir de la matriz
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  // Crear un nuevo libro de Excel
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  
  // Escribir y descargar el archivo Excel
  XLSX.writeFile(workbook, filename);
}

function exportRecipesToExcel() {
  const headers = [
    'Nombre de la Receta',
    'Producto/Ingrediente',
    'Cantidad',
    'Unidad',
    'Costo',
    'Costo Total Receta',
    '% Ganancia',
    'Precio Venta'
  ];

  const worksheetData = [headers];

  recipes.forEach(recipe => {
    recipe.ingredients.forEach((ingredient, index) => {
      worksheetData.push([
        index === 0 ? recipe.name : '',  // Solo la primera fila muestra el nombre de la receta
        ingredient.productName,
        ingredient.quantity,
        ingredient.unit,
        formatCurrency(ingredient.cost),
        index === 0 ? formatCurrency(recipe.totalCost) : ''  // Solo en primera fila el costo total
      ]);
    });
  });

  // Crear el archivo Excel
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Recetas');

  XLSX.writeFile(workbook, 'recetas.xlsx');
}


/* =================== */
/* Event Listeners    */
/* =================== */
document.getElementById('showProductForm').addEventListener('click', () => showProductModal());
document.getElementById('showRecipeForm').addEventListener('click', () => showRecipeModal());
document.getElementById('purchaseQuantity').addEventListener('input', calculateUnitCost);
document.getElementById('totalCost').addEventListener('input', calculateUnitCost);
document.getElementById('productForm').addEventListener('submit', saveProduct);
document.getElementById('recipeForm').addEventListener('submit', saveRecipe);
document.getElementById('addIngredient').addEventListener('click', () => addIngredientRow());

document.getElementById('productSearch').addEventListener('input', displayProducts);
document.getElementById('recipeSearch').addEventListener('input', displayRecipes);

/* =================== */
/* Event Listeners    */
/* =================== */

document.getElementById('exportProducts').addEventListener('click', () => {
  exportToExcel(products, 'productos.xlsx', ['id', 'name', 'unit', 'quantity', 'cost', 'unitCost']);
});

// **¡Aquí está la corrección importante!**
document.getElementById('exportRecipes').addEventListener('click', exportRecipesToExcel);


const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});


if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    console.log('[SW] Intentando registrar el Service Worker...');
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('[SW] Service Worker registrado con éxito:', registration.scope);
      })
      .catch(error => {
        console.error('[SW] Error al registrar el Service Worker:', error);
      });
  });
}


let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('[PWA] Evento beforeinstallprompt capturado');
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('installBtn').style.display = 'block';
});

document.getElementById('installBtn').addEventListener('click', () => {
  if (deferredPrompt) {
    console.log('[PWA] Mostrando prompt de instalación...');
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] Usuario aceptó instalar la PWA');
      } else {
        console.log('[PWA] Usuario rechazó la instalación de la PWA');
      }
      deferredPrompt = null;
      document.getElementById('installBtn').style.display = 'none';
    });
  } else {
    console.warn('[PWA] deferredPrompt no está disponible');
  }
});



// Mostrar mensaje de instalación manual solo si no aparece el botón
window.addEventListener('load', () => {
  setTimeout(() => {
    if (!deferredPrompt) {
      const msg = document.getElementById('manualInstallMessage');
      if (msg) msg.style.display = 'block';
    }
  }, 3000);
});



// Asegurar que el código de las pestañas funcione correctamente
document.addEventListener('DOMContentLoaded', () => {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Aseguramos que solo se muestre la sección con la clase 'active'
  tabContents.forEach(c => {
    if (!c.classList.contains('active')) {
      c.style.display = 'none';
    } else {
      c.style.display = 'block';
    }
  });

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remover 'active' de todas las pestañas y ocultar sus contenidos
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
      });

      // Activar el botón clickeado y su contenido asociado
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      const activeContent = document.getElementById(tabId);
      activeContent.classList.add('active');
      activeContent.style.display = 'block';
    });
  });
});


// El resto del código JavaScript se mantiene igual...



displayProducts();
displayRecipes();