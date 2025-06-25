let sucursales = [];
let productoSeleccionado = null;
let ultimoMensajeToast = "";

document.addEventListener("DOMContentLoaded", () => {
  cargarSucursales();

  document.getElementById("sucursalSelect").addEventListener("change", cargarProductosPorSucursal);
  document.getElementById("buscadorProductos").addEventListener("input", filtrarProductos);

// validacion de cantidad
  document.getElementById("cantidad").addEventListener("input", () => {
    const cantidadInput = document.getElementById("cantidad");
    let cantidad = parseInt(cantidadInput.value);
    
    if (!productoSeleccionado) {
      cantidadInput.value = 0;
      return;
    }

    if (isNaN(cantidad) || cantidad < 1) {
      cantidadInput.value = 1;
      cantidad = 1;
    }

    if (cantidad > productoSeleccionado.stock) {
      mostrarToast(`La cantidad máxima disponible es ${productoSeleccionado.stock}`);
      cantidadInput.value = productoSeleccionado.stock;
      cantidad = productoSeleccionado.stock;
    }

    calcularTotal();
  });


});


if (!!window.EventSource) {
  const source = new EventSource('/stream_stock');

  source.addEventListener('stock_bajo', function(event) {
    const datos = JSON.parse(event.data);

    let mensaje = '⚠️ Stock bajo:\n';
    datos.forEach(item => {
      mensaje += `<li>Producto "<strong>${item.producto}</strong>" en sucursal "<em>${item.sucursal}</em>": ${item.stock} unidades</li>`;
    });

    if (mensaje !== ultimoMensajeToast) {
      mostrarToast(mensaje);
      ultimoMensajeToast = mensaje;
    }
  });

  source.onerror = function(err) {
    console.error('Error en SSE:', err);
    source.close();
  };
} else {
  alert('Tu navegador no soporta Server-Sent Events.');
}
async function cargarSucursales() {
  try {
    const res = await fetch("/sucursales");
    if (!res.ok) throw new Error("No se pudo cargar las sucursales");

    const data = await res.json();
    sucursales = data;

    const selectSucursal = document.getElementById("sucursalSelect");
    selectSucursal.innerHTML = '<option value="">-- Selecciona una sucursal --</option>';

    sucursales.forEach((sucursal) => {
      const option = document.createElement("option");
      option.value = sucursal.sucursal_id;
      option.textContent = sucursal.nombre_sucursal;
      selectSucursal.appendChild(option);
    });

    // Mostrar todos los productos de todas las sucursales al cargar
    mostrarTodosLosProductos();
  } catch (err) {
    alert("Error al cargar sucursales: " + err.message);
  }
}

async function mostrarTodosLosProductos() {
  const container = document.getElementById("productosContainer");
  container.innerHTML = "";
  productoSeleccionado = null;

  try {
    const res = await fetch("/productos");
    if (!res.ok) throw new Error("No se pudieron cargar los productos");

    const productos = await res.json();

    console.log("Productos recibidos:", productos);

    if (!Array.isArray(productos)) {
      throw new Error("Respuesta no es un array de productos");
    }

    productos.forEach((producto) => {
      const card = crearCardProducto(producto, producto.nombre_sucursal || "");
      container.appendChild(card);
    });
    console.log("Productos recibidos del backend:", productos);

    document.getElementById("precioUnitario").textContent = "0";
    document.getElementById("total").textContent = "0";
    document.getElementById("totalUSD").textContent = "0";

    filtrarProductos(); // Aplica filtro si hay texto en el buscador
  } catch (error) {
    console.error("Error en mostrarTodosLosProductos:", error);
    mostrarToast("❌ Error al cargar productos: " + error.message);
  }
}
function cargarProductosPorSucursal() {
  const idSucursal = document.getElementById("sucursalSelect").value;
  const sucursal = sucursales.find((s) => s.sucursal_id == idSucursal);

  const container = document.getElementById("productosContainer");
  container.innerHTML = "";
  productoSeleccionado = null;

  if (sucursal && sucursal.productos) {
    sucursal.productos.forEach((producto) => {
      const card = crearCardProducto(producto, sucursal.nombre_sucursal);
      container.appendChild(card);
    });
  } else if (!idSucursal) {
    // Si no hay sucursal seleccionada, mostrar todos los productos
    mostrarTodosLosProductos();
  }

  document.getElementById("precioUnitario").textContent = "0";
  document.getElementById("total").textContent = "0";
  document.getElementById("totalUSD").textContent = "0";

  filtrarProductos(); // Aplica filtro
}

function crearCardProducto(producto, nombreSucursal) {
  const card = document.createElement("div");
  card.className = "producto-card border p-4 rounded cursor-pointer hover:shadow-lg transition relative";
  card.dataset.productoId = producto.producto_id;
  card.dataset.precio = producto.precio;
  card.dataset.imagen = producto.imagen;
  card.dataset.nombre = (producto.nombre || "").toLowerCase();
  card.dataset.sucursal = (producto.nombre_sucursal || "").toLowerCase();

  card.innerHTML = `
    <strong>${producto.nombre}</strong><br />
    <img src="${producto.imagen}" alt="${producto.nombre}" class="producto-imagen w-full h-32 object-contain my-2" /><br />
    <p class="text-sm text-gray-600">Sucursal: ${nombreSucursal}</p>
    <p class="font-semibold">Precio: $${producto.precio.toLocaleString("es-CL")}</p>
    <p class="text-sm ${producto.stock > 0 ? 'text-green-600' : 'text-red-600'}">Stock: ${producto.stock}</p>
  `;

  card.onclick = () => seleccionarProducto(producto, card);
  return card;
}

function seleccionarProducto(producto, card) {
  productoSeleccionado = producto;

  document.querySelectorAll(".producto-card").forEach((c) => {
    c.classList.remove("seleccionado");
  });

  card.classList.add("seleccionado");

  document.getElementById("precioUnitario").textContent = producto.precio;
  calcularTotal();
}

async function calcularTotal() {
  const precio = parseInt(document.getElementById("precioUnitario").textContent);
  const cantidad = parseInt(document.getElementById("cantidad").value);

  const formatterCLP = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  });

  const formatterUSD = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

  if (!isNaN(precio) && cantidad > 0) {
    const total = precio * cantidad;

    document.getElementById("total").textContent = formatterCLP.format(total);

    try {
      const res = await fetch("/calcular_usd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ total_clp: total }),
      });

      const data = await res.json();
      const totalUSD = data.total_usd;

      document.getElementById("totalUSD").textContent =
        totalUSD != null ? formatterUSD.format(totalUSD) : "Error";
    } catch {
      document.getElementById("totalUSD").textContent = "Error";
    }
  } else {
    document.getElementById("total").textContent = formatterCLP.format(0);
    document.getElementById("totalUSD").textContent = formatterUSD.format(0);
  }
}

function confirmarCompra() {
  const sucursalId = document.getElementById("sucursalSelect").value;
  const cantidad = parseInt(document.getElementById("cantidad").value);
  const productoId = productoSeleccionado ? productoSeleccionado.producto_id : null;

  const totalText = document.getElementById("total").textContent.replace(/\$/g, "").replace(/\./g, "").trim();
  const totalCLP = parseInt(totalText);

  console.log("Datos de compra:", totalCLP, sucursalId, cantidad, productoId);
  if (!productoSeleccionado) {
    mostrarToast(" Debes seleccionar un producto.");
    return;
  }

  if (cantidad < 1) {
    mostrarToast(" La cantidad debe ser al menos 1.");
    return;
  }

  if (cantidad > productoSeleccionado.stock) {
    mostrarToast(` No hay stock suficiente. Solo quedan ${productoSeleccionado.stock} unidades.`);
    return;
  }

  

  iniciarPago(totalCLP, sucursalId, cantidad);
}

function iniciarPago(monto, sucursal, cantidad) {
  fetch("/iniciar_pago", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: monto,
      sucursal: sucursal,
      cantidad: cantidad,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.url && data.token) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = data.url;

        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "token_ws";
        input.value = data.token;

        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
      } else {
        mostrarToast("❌ Error al iniciar el pago.");
      }
    })
    .catch((error) => {
      console.error("Error en el pago:", error);
      mostrarToast("❌ Hubo un problema al conectar con el servidor.");
    });
}

function mostrarToast(mensaje) {
  const toast = document.getElementById("miToast");
  const toastMensaje = document.getElementById("toastMensaje");

  if (toast && toastMensaje) {
    toastMensaje.innerHTML = mensaje.replace(/\n/g, "<br>"); 

    toast.classList.add("mostrar");
    toast.classList.remove("translate-y-full", "opacity-0");

    setTimeout(() => {
      toast.classList.add("translate-y-full", "opacity-0");
      toast.classList.remove("mostrar");
    }, 3000);
  } else {
    alert(mensaje);
  }
}

function filtrarProductos() {
  const filtro = document.getElementById("buscadorProductos").value.toLowerCase();
  const cards = document.querySelectorAll(".producto-card");

  cards.forEach((card) => {
    const nombre = card.dataset.nombre || "";
    const sucursal = card.dataset.sucursal || "";

    const coincide = nombre.includes(filtro) || sucursal.includes(filtro);
    card.style.display = coincide ? "block" : "none";
  });
}
