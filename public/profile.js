socket.emit("info")
const $devices_ul =$('#devices_ul')
socket.on("info",(data)=>{
    console.log(data)

    //  token: { type: String },
    //         device: { type: String},
    //         ip: { type: String },
    //         userAgent: { type: String},
    //         createdAt: { type: Date},
    //         expiresAt: { type: Date},
    //         lastActive: { type: Date},
    data?.devices.forEach(device => {
        
        $li=(`
            <li class="list-group-item mb-1 justify-content-between" role="presentation" >
                <span class="fs-5 text-primary">
                    ${device.userAgent}
                </span>
                <div class="row gap-3 col-12 justify-content-between ">
                    <span class="col-auto col-md-3  text-secondary">
                        Ip: ${device.ip}
                    </span>
                    <div class="gap-1  d-flex col-auto overflow-x-auto p-0 hide-scrollbar">
                        <span class="col-auto px-2 rounded border border-secondary border-2 text-secondary bg-secondary-subtle ">
                            Loggedin at: ${new Date(device?.createdAt).toLocaleDateString('fa-IR',{'year':'2-digit','month':'2-digit','day':'2-digit'})}
                        </span>
                        <span class="col-auto px-2 rounded border border-primary border-2 text-primary bg-primary-subtle">
                            Last Active: ${new Date(device?.lastActive).toLocaleDateString('fa-IR',{'year':'2-digit','month':'2-digit','day':'2-digit','hour':'2-digit','minute':'2-digit'})}
                        </span>

                        <span class="col-auto px-2 rounded border border-danger border-2 text-danger bg-danger-subtle ">
                            Expires at: ${new Date(device?.expiresAt).toLocaleDateString('fa-IR',{'year':'2-digit','month':'2-digit','day':'2-digit'})}
                        </span>
                    </div>
                </div>
            </li>
            `)
        $devices_ul.append($li)
    });
})