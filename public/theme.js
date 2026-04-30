function init_theme(){
    let val = localStorage.getItem('MC_theme') ?? 'auto'

    
    ChangeTheme(val,false)
    
    $('#theme_btn').click(() => {
        ChangeTheme($('#theme_btn [data-active="true"]').data('theme'))
    })
}

function getAutoTheme() {
    const hour = new Date().getHours()
    // روز: 6 صبح تا 6 عصر، شب: 6 عصر تا 6 صبح
    return (hour >= 6 && hour < 18) ? 'light' : 'dark'
}

function ChangeTheme(val,animate=true){
    if(!val) val = 'auto'
    
    // ذخیره در localStorage
    localStorage.setItem('MC_theme', val)
    theme.val(val)

    // اگر auto انتخاب شده، تم فعلی را محاسبه کن
    if(val === 'auto') {
        val = getAutoTheme()
    }
    console.log(val)
    const reverse_val = {
        'dark': 'light',
        'light': 'dark',
        'auto': 'auto'
    }
    
    // آپدیت دکمه تم
    if(animate){
        $(`#theme_btn [data-theme="${val}"`).removeClass('animate__backOutDown').addClass('animate__backInUp')
        $(`#theme_btn .btn[data-theme="${reverse_val[val]}"]`).addClass('animate__backOutDown')
    
        $(`#theme_btn [data-theme="${val}"]`).attr('data-active', 'false').show()
        setTimeout(() => {
            $(`#theme_btn [data-theme="${reverse_val[val]}"]`).attr('data-active', 'true').removeClass('animate__backInUp').hide()
            // $(`#theme_btn .btn.position-absolute`).removeClass('position-absolute')
        }, 1000);
    }else{
    
        $(`#theme_btn [data-theme="${val}"]`).attr('data-active', 'false').show()
        $(`#theme_btn [data-theme="${reverse_val[val]}"]`).attr('data-active', 'true').hide()
    }
    
    // اعمال تم به المان‌ها
    $('div').attr('data-bs-theme', val)
    $('body').attr('data-bs-theme', val)
    
}

const theme = $("#theme")

init_theme()
$(document).ready(function() {
    
    // بررسی تغییر خودکار هر دقیقه (اختیاری)
    setInterval(() => {
        const currentTheme = localStorage.getItem('MC_theme')
        if(currentTheme === 'auto') {
            const autoTheme = getAutoTheme()
            // فقط اگر تم تغییر کرده، اعمال کن
            if($('body').attr('data-bs-theme') !== autoTheme) {
                ChangeTheme('auto')
            }
        }
    }, 60000) // هر 1 دقیقه
})
