// $(document).ready(function() {
//     $('#sendSMS').click(function() {
//       var mobileSMS = ;
//       var messageSMS = `Your verification code is: ${}` ;

//       $.ajax({
//         url: 'https://portal.mellicloud.com/smss/SendMessage1.php', // Updated URL
//         type: 'POST',
//         data: {
//           mobileSMS: mobileSMS,
//           messageSMS: messageSMS
//         },
//         dataType: 'json',
//         success: function(response) {
//           if (response.status === 'success') {
//             $('#responseMessage').text(response.message);
//           } else {
//             $('#responseMessage').text('Error: ' + response.message);
//           }
//         },
//         error: function(xhr, status, error) {
//           $('#responseMessage').text('AJAX Error: ' + error + ' | Status: ' + status + ' | Response: ' + xhr.responseText);
//         }
//       });

//     });
//   });