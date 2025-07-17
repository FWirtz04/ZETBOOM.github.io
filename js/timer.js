(function ($) {
    $.fn.countdown = function (options) {
        let settings = $.extend({
            seconds: 0,
            onTick: function (secondsLeft) {},
        }, options);

        let $countdown = this;

        function formatWithLeadingZero(number) {
            return (number < 10 ? '0' : '') + number;
        }


        function updateCountdown() {
            let secondsLeft = settings.seconds;

            let days = Math.floor(secondsLeft / (3600 * 24));
            let hours = Math.floor((secondsLeft % (3600 * 24)) / 3600);
            let minutes = Math.floor((secondsLeft % 3600) / 60);
            let seconds = secondsLeft % 60;

            let cases = [2, 0, 1, 1, 1, 2];
            let titles = ['д.', 'д.', 'д.'];
            let daysString = '';
            if(days > 0) {
                daysString = `${days} ${titles[(days % 100 > 4 && days % 100 < 20) ? 2 : cases[Math.min(days % 10, 5)]]}`;
            }

            let hoursString = formatWithLeadingZero(hours);
            let minutesString = formatWithLeadingZero(minutes);
            let secondsString = formatWithLeadingZero(seconds);

            $countdown.html(`<div class="timer-days">${daysString}</div><div class="timer-item">${hoursString}</div><span>:</span><div class="timer-item">${minutesString}</div><span>:</span><div class="timer-item">${secondsString}</div>`);

            settings.onTick(secondsLeft);
        }

        setInterval(function () {
            settings.seconds--;
            if (settings.seconds >= 0) {
                updateCountdown();
            }
        }, 1000);

        updateCountdown();
    };
})(jQuery);