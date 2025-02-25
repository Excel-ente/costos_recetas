// Almacenamiento inicial
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
    // Asignar % ganancias y precio de venta almacenados, si existen
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
    <select class="ingredient-product" required>
      <option value="">Seleccione un producto</option>
      ${products.map(p => `
        <option value="${p.id}" ${ingredient && p.id == ingredient.productId ? 'selected' : ''}>
          ${p.name} (${p.unit})
        </option>
      `).join('')}
    </select>
    <input type="number" class="ingredient-quantity" min="0.01" step="0.01" value="${ingredient ? ingredient.quantity : ''}" required>
    <select class="ingredient-unit" required>
      ${product ? getCompatibleUnits(product.unit).map(unit => `
        <option value="${unit}" ${ingredient && unit === ingredient.unit ? 'selected' : ''}>
          ${unit}
        </option>
      `).join('') : '<option value="">Seleccione unidad</option>'}
    </select>
    <button type="button" class="btn-danger" onclick="this.parentElement.remove();updateRecipeTotalCost();">
      Eliminar
    </button>
  `;
  
  const productSelect = container.querySelector('.ingredient-product');
  productSelect.addEventListener('change', () => {
    const prod = products.find(p => p.id == productSelect.value);
    const unitSelect = container.querySelector('.ingredient-unit');
    if (prod) {
      unitSelect.innerHTML = getCompatibleUnits(prod.unit)
        .map(unit => `<option value="${unit}">${unit}</option>`)
        .join('');
    } else {
      unitSelect.innerHTML = '<option value="">Seleccione unidad</option>';
    }
    updateRecipeTotalCost();
  });
  
  container.querySelectorAll('select, input').forEach(el => {
    el.addEventListener('change', updateRecipeTotalCost);
  });
  
  document.getElementById('ingredientsContainer').appendChild(container);
  updateRecipeTotalCost();
}

function updateRecipeTotalCost() {
  let totalCost = 0;
  document.querySelectorAll('.ingredient-row').forEach(row => {
    const productId = row.querySelector('.ingredient-product').value;
    const quantity = parseFloat(row.querySelector('.ingredient-quantity').value);
    const unit = row.querySelector('.ingredient-unit').value;
    
    if (productId && quantity && unit) {
      const product = products.find(p => p.id == productId);
      try {
        const convertedQuantity = convertUnit(quantity, unit, product.unit);
        const cost = (convertedQuantity / product.quantity) * product.cost;
        totalCost += cost;
      } catch (error) {
        console.error(error);
      }
    }
  });
  
  document.getElementById('recipeTotalCost').textContent = formatCurrency(totalCost);
  // Actualizar precio de venta basado en % ganancias
  const profit = parseFloat(document.getElementById('profitPercentage').value) || 0;
  const salePrice = totalCost * (1 + profit / 100);
  document.getElementById('salePrice').value = salePrice.toFixed(2);
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
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text(recipe.name, 20, 20);
  
  doc.setFontSize(12);
  doc.text('Ingredientes:', 20, 35);
  
  let y = 45;
  recipe.ingredients.forEach(ing => {
    doc.text(`- ${ing.quantity} ${ing.unit} de ${ing.productName} - ${formatCurrency(ing.cost)}`, 25, y);
    y += 10;
  });
  
  doc.text(`Costo Total: ${formatCurrency(recipe.totalCost)}`, 20, y + 10);
  doc.text(`% Ganancias: ${recipe.profitPercentage}%`, 20, y + 20);
  doc.text(`Precio de Venta: ${formatCurrency(recipe.salePrice)}`, 20, y + 30);
  doc.save(`receta-${recipe.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

/* =================== */
/* Exportar a CSV     */
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

document.getElementById('exportProducts').addEventListener('click', () => {
  // Exportar productos; se usan las claves que se desean en el CSV
  exportToExcel(products, 'productos.xlsx', ['id', 'name', 'unit', 'quantity', 'cost', 'unitCost']);
});

document.getElementById('exportRecipes').addEventListener('click', () => {
  // Exportar recetas; se exportan campos básicos
  exportToExcel(recipes, 'recetas.xlsx', ['id', 'name', 'totalCost', 'profitPercentage', 'salePrice']);
});

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
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('Service Worker registrado con éxito:', registration.scope);
      })
      .catch(error => {
        console.log('Error al registrar el Service Worker:', error);
      });
  });
}


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



let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('installBtn').style.display = 'block';
});

document.getElementById('installBtn').addEventListener('click', () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('El usuario aceptó instalar la PWA');
      } else {
        console.log('El usuario rechazó la instalación');
      }
      deferredPrompt = null;
      document.getElementById('installBtn').style.display = 'none';
    });
  }
});

// 🔹 Mostrar mensaje para instalar manualmente si el botón no aparece
window.addEventListener('load', () => {
  setTimeout(() => {
    if (!deferredPrompt) {
      document.getElementById('manualInstallMessage').style.display = 'block';
    }
  }, 3000);
});

displayProducts();
displayRecipes();


