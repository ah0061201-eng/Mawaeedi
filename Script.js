
const form = document.getElementById("appointment-form");
const taskInput = document.getElementById("task");
const timeInput = document.getElementById("time");
const appointmentsContainer = document.getElementById("appointments");

let appointments = JSON.parse(
  localStorage.getItem("mawaeedi-appointments") || "[]"
);

function saveAppointments() {
  localStorage.setItem(
    "mawaeedi-appointments",
    JSON.stringify(appointments)
  );
}

function renderAppointments() {
  appointmentsContainer.innerHTML = "";

  if (appointments.length === 0) {
    appointmentsContainer.textContent = "لا توجد مواعيد حتى الآن.";
    return;
  }

  appointments.forEach((appointment, index) => {
    const card = document.createElement("div");
    card.className = "appointment";

    const title = document.createElement("h3");
    title.textContent = appointment.task;

    const time = document.createElement("p");
    time.textContent = `وقت الموعد: ${appointment.time}`;

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "حذف الموعد";
    deleteButton.type = "button";
    deleteButton.style.background = "#dc2626";

    deleteButton.addEventListener("click", () => {
      appointments.splice(index, 1);
      saveAppointments();
      renderAppointments();
    });

    card.append(title, time, deleteButton);
    appointmentsContainer.appendChild(card);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const task = taskInput.value.trim();
  const time = timeInput.value;

  if (!task || !time) return;

  appointments.push({ task, time });
  saveAppointments();
  renderAppointments();
  form.reset();
});

renderAppointments();
