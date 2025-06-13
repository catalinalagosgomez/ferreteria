let sucursales = [];

document.addEventListener('DOMContentLoaded', () => {
  cargarSucursales();

  const select = document.getElementById('filtroSelect');
  if (select) select.addEventListener('change', actualizarPrecio);

  const inputCantidad = document.getElementById('cantidad');
  if (inputCantidad) inputCantidad.addEventListener('input', calcularTotal);
});

async function cargarSucursales() {
  try {
    const res = await fetch('/sucursales');
    if (!res.ok) throw new Error('No se pudo cargar las sucursales');

    const data = await res.json();
    sucursales = data;

    const select = document.getElementById('filtroSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Selecciona --</option>';
    data.forEach(sucursal => {
      const option = document.createElement('option');
      option.value = sucursal.id;
      option.textContent = sucursal.nombre;
      select.appendChild(option);
    });
  } catch (err) {
    alert('Error al cargar sucursales: ' + err.message);
  }
}

async function buscarSucursal() {
  const inputTexto = document.getElementById('filtroTexto').value.trim();
  const selectValor = document.getElementById('filtroSelect').value;

  const filtro = inputTexto !== '' ? inputTexto : selectValor;
  let url = '/sucursales';

  if (filtro) url += '?filtro=' + encodeURIComponent(filtro);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error en la respuesta');
    const data = await res.json();

    const lista = document.getElementById('resultados');
    if (!lista) return;

    lista.innerHTML = '';

    if (data.length === 0) {
      lista.innerHTML = '<li>No se encontraron sucursales.</li>';
      return;
    }

    data.forEach(sucursal => {
      const li = document.createElement('li');
      li.textContent = `${sucursal.nombre}, Cantidad: ${sucursal.cantidad}, Precio: $${sucursal.precio}`;
      lista.appendChild(li);
    });
  } catch (error) {
    alert('Error al obtener datos: ' + error.message);
  }
}

function actualizarPrecio() {
  const idSeleccionado = document.getElementById('filtroSelect').value;
  const sucursal = sucursales.find(s => s.id == idSeleccionado);

  if (sucursal) {
    document.getElementById('precioUnitario').textContent = sucursal.precio;
    calcularTotal();
  } else {
    document.getElementById('precioUnitario').textContent = '0';
    document.getElementById('total').textContent = '0';
    document.getElementById('totalUSD').textContent = '0';
  }
}

async function calcularTotal() {
  const idSeleccionado = document.getElementById('filtroSelect').value;
  const cantidad = parseInt(document.getElementById('cantidad').value);
  const sucursal = sucursales.find(s => s.id == idSeleccionado);

  if (sucursal && cantidad > 0) {
    const total = cantidad * sucursal.precio;
    document.getElementById('total').textContent = total;

    try {
      const res = await fetch('/calcular_usd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total_clp: total })
      });

      const data = await res.json();
      document.getElementById('totalUSD').textContent = data.total_usd ?? 'Error';
    } catch (err) {
      document.getElementById('totalUSD').textContent = 'Error';
    }

  } else {
    document.getElementById('total').textContent = '0';
    document.getElementById('totalUSD').textContent = '0';
  }
}

function realizarVenta() {
    const cantidadInput = document.getElementById("cantidad").value;
    const sucursal = document.getElementById("selectSucursal").value;
    const cantidad = parseInt(cantidadInput);

    if (!cantidad || cantidad <= 0) {
        mostrarToast("⚠️ Cantidad inválida.");
        return;
    }

    if (!validarStock()) return;

    fetch("/realizar_venta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sucursal: sucursal, cantidad: cantidad })
    })
    .then(res => res.json())
    .then(data => {
        mostrarToast(data.message);
    })
    .catch(() => {
        mostrarToast("❌ Error en la venta");
    });
}

function iniciarPago(monto, sucursal, cantidad) {
    fetch("/iniciar_pago", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount: monto, sucursal: sucursal, cantidad: cantidad })
    })
    .then(response => response.json())
    .then(data => {
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
    .catch(error => {
        console.error("Error en el pago:", error);
        mostrarToast("❌ Hubo un problema al conectar con el servidor.");
    });
}

function filtrarSucursales() {
    const input = document.getElementById("buscadorSucursal").value.toLowerCase();
    const sucursales = document.querySelectorAll(".sucursal-item");

    sucursales.forEach((item) => {
        const nombre = item.getAttribute("data-nombre");
        if (nombre.includes(input)) {
            item.style.display = "flex";
        } else {
            item.style.display = "none";
        }
    });
}

function mostrarToast(mensaje) {
    const toast = document.getElementById("toastSSE");
    toast.textContent = mensaje;
    toast.classList.remove("hidden");
    toast.style.opacity = "1";

    setTimeout(() => {
        toast.style.opacity = "0";
    }, 4000);

    setTimeout(() => {
        toast.classList.add("hidden");
    }, 4500);
}
function confirmarCompra() {
    const idSucursal = document.getElementById('filtroSelect').value;
    const cantidadInput = document.getElementById('cantidad').value;
    const cantidad = parseInt(cantidadInput);
    const totalCLP = parseInt(document.getElementById('total').textContent);

    if (!idSucursal || isNaN(cantidad) || cantidad <= 0 || isNaN(totalCLP) || totalCLP <= 0) {
        mostrarToast("⚠️ Verifica la sucursal, cantidad y total antes de continuar.");
        return;
    }

    iniciarPago(totalCLP, idSucursal, cantidad);
}
