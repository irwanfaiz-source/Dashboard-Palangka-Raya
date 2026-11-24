

function triggerPrintView() {
  const printTs = document.getElementById('printTimestamp');
  if (printTs) printTs.innerText = new Date().toLocaleString('id-ID');
  window.print();
}

function logoutApp() {
  if (window.firebase && firebase.auth) {
    firebase.auth().signOut().then(() => {
      window.location.href = 'login.html';
    }).catch(() => {
      window.location.href = 'login.html';
    });
  } else {
    window.location.href = 'login.html';
  }
}

