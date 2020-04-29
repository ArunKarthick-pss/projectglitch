const axios = require('axios');
var base64 = require('base-64');
function checkwindow(primarytimecreated, secondarytimecreated, windowDuration) {
  return diffTime(primarytimecreated, secondarytimecreated)<= windowDuration * 60 * 1000;
}
function diffTime(a, b) {
  console.log(new Date(a) - new Date(b))
  return new Date(a) - new Date(b);
}
function mergewithtickets(data) {
  console.log("totaldata", data);
  const headers = { "Content-Type": "application/json; charset=utf-8" },
    options = { headers, auth: { username: `${data.apiKey}`, password: 'x' } };
  console.log(options);
  let insideduration = checkwindow(data.secondaryticket.created_at, data.primaryticket.created_at, data.windowDuration);
  console.log("primaryduration", data.primaryticket.created_at);
  console.log("secondaryduration", data.secondaryticket.created_at);
  console.log("window", data.windowDuration)
  console.log("windowduration", insideduration);
  if (insideduration) {
    console.log("particular duration in window");
    let updatePrimaryData = {
      private: true,
      body: `Merged from ticket <a href="${data.secondaryticket.id}">${data.secondaryticket.id}</a> by the TicketMerger App!<div>Subject :${data.secondaryticket.subject}</div><div>Description: ${data.secondaryticket.description_text}</div>`
    },
      updateSecondaryData = {
        private: true,
        body: `This ticket is closed and merged into ticket <a href="${data.primaryticket.id}">${data.primaryticket.id}</a> by the TicketMerger App!`
      },
      closeTicketData = {
        "status": 5
      }
    try {
      axios.post(`https://${data.domain}/api/v2/tickets/${data.primaryticket.id}/notes`, updatePrimaryData, options).then(function (primarydata) {
        console.log(primarydata);

      });
      axios.post(`https://${data.domain}/api/v2/tickets/${data.secondaryticket.id}/notes`, updateSecondaryData, options).then(function (secondarydata) {
        console.log(secondarydata);

      });
      axios.put(`https://${data.domain}/api/channel/v2/tickets/${data.secondaryticket.id}`, closeTicketData, options).then(function (closeticket) {
        console.log(closeticket);
      });
    } catch (E) {
      console.log({ E })
    }
  }else{
        console.log("in else of merge wih t pri")
        let requesterID = data.key, ticket = data.secondaryticket, windowDuration = data.windowDuration;
        console.log( "RequesterID",requesterID )
        $db.set(requesterID, {
            id: ticket.id,
            created_at: ticket.created_at
        }).then(() => {
            console.log('db created for ticket' + ticket.id)
        }).fail(error => {
            console.log(`fail for ticket ${ticket.id}`, error);
            updateDB(requesterID, ticket, windowDuration,data);
        });
  }
}
async function updateDB(requesterID, ticket, windowDuration, args) {
  if (error.status === 400) {
      let setDb = await $db.get(requesterID.toString()).then(function (primary) {
          if (helpers.withInWindow(primary, ticket, windowDuration)) {
              console.log('withInWindow uupdate DB');
              mergewithtickets(args);
          } else {
              $db.delete(requesterID.toString()).then(function () {
                  console.log('db delete ');
                  helpers.saveTicket(requesterID.toString(), ticket);
              });
          }
      })
      return setDb;
  }
}
function regexify(str) {
  if (!str) {
    return [];
  }
return str.split(",").map(e => {
    try {
      return new RegExp(
        e
          .replace(".", ".")
          .replace("*", ".*?")
          .trim(),
        "i"
      );
    } catch (error) {
      return matchNothing;
    }
  });
}
exports = {
  events: [
    { event: 'onTicketCreate', callback: 'onTicketCreateHandler' }
  ],
  onTicketCreateHandler: function (args) {
    let primary = args.data, secondaryticket = primary.ticket, requester = args.data.requester, iparams = args.iparams
    // let key = requester.id;
    console.log("sec",secondaryticket);
    const include = regexify(iparams.include), 
    exclude = regexify(iparams.exclude);
    include_domain = regexify(iparams.include_domain);
    include_domain.forEach(function (value) {
    include.push(value);
});
    exclude_domain = regexify(iparams.exclude_domain);
    exclude_domain.forEach(function (value) {
    exclude.push(value);
});
    const windowDuration = parseInt(iparams.window, 10);
    if (iparams.merge_ticket == "Yes") {
    var key = requester.id.toString();
    $db.get(key).then (
      function(primaryticket) {
         console.log(primaryticket);
        if(primaryticket.id!=secondaryticket.id){
        mergewithtickets({
          primaryticket,
          secondaryticket,
          requester,
          key,
          domain:iparams.domain,
          apiKey:iparams.apiKey,
          iparams:iparams.merge_ticket,
          windowDuration,
          })  
        }else{
          console.log("both are same tickets");
        }
        
      },
      function(error) {
        if (error.status == 404) {
          $db.set(key, { id:primary.ticket.id,product:primary.ticket.product_id, created_at: primary.ticket.created_at }).then(function (data) {
              console.log({ data })
          }, function (error) {
              console.log(error)
          });
      }
        
      });
    }
    else{
      var key = requester.id.toString() + "_" + secondaryticket.product_id;
      $db.get(key).then (
        function(primaryticket) {
           console.log(primaryticket);
          if(primaryticket.product==secondaryticket.product_id){
          mergewithtickets({
            primaryticket,
            secondaryticket,
            requester,
            key,
            domain:iparams.domain,
            apiKey:iparams.apiKey,
            iparams:iparams.merge_ticket,
            windowDuration,
            })  
          }else{
            console.log("both are same tickets");
          }
          
        },
        function(error) {
          if (error.status == 404) {
            $db.set(key, { id:primary.ticket.id,product:primary.ticket.product_id, created_at: primary.ticket.created_at }).then(function (data) {
                console.log({ data })
            }, function (error) {
                console.log(error)
            });
        }
          
        });

    }
  
}
};
