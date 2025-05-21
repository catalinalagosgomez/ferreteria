let sucursales = []; // Se guarda la lista con precios

document.addEventListener('DOMContentLoaded', () => {
  cargarSucursales();
});

async function cargarSucursales() {
  try {
    const res = await fetch('/sucursales');
    if (!res.ok) throw new Error('No se pudo cargar las sucursales');
    const data = await res.json();

    sucursales = data; // Guarda globalmente las sucursales

    const select = document.getElementById('filtroSelect');
    select.innerHTML = '<option value="">-- Selecciona --</option>'; // Limpiar antes de agregar

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

  if (filtro) {
    url += '?filtro=' + encodeURIComponent(filtro);
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error en la respuesta');
    const data = await res.json();

    const lista = document.getElementById('resultados');
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ total_clp: total })
      });

      const data = await res.json();
      if (data.total_usd !== undefined) {
        document.getElementById('totalUSD').textContent = data.total_usd;
      } else {
        document.getElementById('totalUSD').textContent = 'Error';
      }
    } catch (err) {
      document.getElementById('totalUSD').textContent = 'Error';
    }

  } else {
    document.getElementById('total').textContent = '0';
    document.getElementById('totalUSD').textContent = '0';
  }
}
