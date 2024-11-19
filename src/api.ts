/* eslint-disable @typescript-eslint/naming-convention */

import assert from 'node:assert';

import userAgent from './userAgent.ts';

const extractCSRF = (cookies: string): string | undefined => {
    const target = cookies.split(';').filter((value) => /^\s*bili_jct=/.test(value));
    return target.length > 0 ? target[0].replace(/^\s*bili_jct=(.*)\s*/, '$1') : undefined;
};

interface APIReturn {
    code: number | string;
    message: string;
    data: unknown;
}

interface NavInfo {
    isLogin: boolean;
    email_verified: number;
    face: string;
    face_nft: number;
    face_nft_type: number;
    level_info: {
        current_level: number;
        current_min: number;
        current_exp: number;
        next_exp: string;
    };
    mid: number;
    mobile_verified: number;
    money: number;
    moral: number;
    official: {
        role: number;
        title: string;
        desc: string;
        type: number;
    };
    officialVerify: {
        type: number;
        desc: string;
    };
    pendant: {
        pid: number;
        name: string;
        image: string;
        expire: number;
        image_enhance: string;
        image_enhance_frame: string;
    };
    scores: number;
    uname: string;
    vipDueDate: number;
    vipStatus: number;
    vipType: number;
    vip_pay_type: number;
    vip_theme_type: number;
    vip_label: {
        path: string;
        text: string;
        label_theme: string;
        text_color: string;
        bg_style: number;
        bg_color: string;
        border_color: string;
    };
    vip_avatar_subscript: number;
    vip_nickname_color: string;
    vip: {
        type: number;
        status: number;
        due_date: number;
        vip_pay_type: number;
        theme_type: number;
        label: {
            path: string;
            text: string;
            label_theme: string;
            text_color: string;
            bg_style: number;
            bg_color: string;
            border_color: string;
        };
        avatar_subscript: number;
        nickname_color: string;
        role: number;
        avatar_subscript_url: string;
    };
    wallet: {
        mid: number;
        bcoin_balance: number;
        coupon_balance: number;
        coupon_due_time: number;
    };
    has_shop: boolean;
    shop_url: string;
    allowance_count: number;
    answer_status: number;
    is_senior_member: number;
}

const getNavInfo = async (cookies: string): Promise<NavInfo> => {
    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://www.bilibili.com/');

    const req = await fetch('https://api.bilibili.com/x/web-interface/nav', { headers });
    const res = await req.json() as APIReturn;

    assert(res.code === 0, res.message);

    return res.data as NavInfo;
};

interface PrivilegeData {
    is_short_vip: boolean;
    is_freight_open: boolean;
    list: {
        type: number;
        state: number;
        expire_time: number;
        vip_type: number;
        next_receive_days: number;
        period_end_unix: number;
    }[];
}

const getPrivilege = async (cookies: string): Promise<PrivilegeData> => {
    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://www.bilibili.com/');

    const req = await fetch('https://api.bilibili.com/x/vip/privilege/my', { headers });
    const res = await req.json() as APIReturn;

    assert(res.code === 0, res.message);

    return res.data as PrivilegeData;
};

const receivePrivilege = async (cookies: string, type: number): Promise<void> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://www.bilibili.com/');
    headers.set('Content-Type', 'application/x-www-form-urlencoded');

    const body = new URLSearchParams();
    body.set('type', type.toString());
    body.set('csrf', csrf);
    body.set('csrf_token', csrf);

    const req = await fetch('https://api.bilibili.com/x/vip/privilege/receive', { method: 'POST', headers, body });
    const res = await req.json() as APIReturn;

    assert(res.code === 0, res.message);
};

interface UserCouponData {
    page: {
        currentPage: number;
        pageSize: number;
        totalCount: number;
        totalPage: number;
    };
    result: {
        activityId: number;
        activityName: string;
        couponToken: string;
        couponMoney: number;
        couponBalance: number;
        status: number;
        couponDueTime: number;
        receiveTime: number;
    }[];
}

const getUserCoupon = async (
    cookies: string,
    beginTime: string,
    endTime: string,
    timestamp: number,
    currentPage = 1,
    pageSize = 10,
): Promise<UserCouponData> => {
    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://pay.bilibili.com/pay-v2-web/bcoin_record');
    headers.set('Content-Type', 'application/json');

    const body = JSON.stringify({
        currentPage,
        pageSize,
        beginTime,
        endTime,
        timestamp,
    });

    const req = await fetch('https://pay.bilibili.com/paywallet/coupon/listForUserCoupons', { method: 'POST', headers, body });
    const res = await req.json() as APIReturn;

    assert(res.code === 0, res.message);

    return res.data as UserCouponData;
};

interface OrderData {
    bp: number;
    gold: number;
    order_id: string;
    status: number;
}

const createOrder = async (
    cookies: string,
    pay_bp: number,
    common_bp: number,
    ios_bp: number,
    goods_num: number,
    goods_type = 2,
    goods_id = 1,
    context_type = 11,
    context_id = 1,
    platform = 'pc',
): Promise<OrderData> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://link.bilibili.com/');
    headers.set('Content-Type', 'application/x-www-form-urlencoded');

    const body = new URLSearchParams();
    body.set('pay_bp', pay_bp.toString());
    body.set('common_bp', common_bp.toString());
    body.set('ios_bp', ios_bp.toString());
    body.set('goods_type', goods_type.toString());
    body.set('goods_id', goods_id.toString());
    body.set('goods_num', goods_num.toString());
    body.set('context_type', context_type.toString());
    body.set('context_id', context_id.toString());
    body.set('platform', platform);
    body.set('csrf', csrf);
    body.set('csrf_token', csrf);

    const req = await fetch('https://api.live.bilibili.com/xlive/revenue/v1/order/createOrder', { method: 'POST', headers, body });
    const res = await req.json() as APIReturn;

    assert(res.code === 0, res.message);

    return res.data as OrderData;
};

interface UserInfo {
    uid: number;
    uname: string;
    silver: number;
    gold: number;
    face: string;
    achieve: number;
    vip: number;
    svip: number;
    user_level: number;
    user_next_level: number;
    user_intimacy: number;
    user_next_intimacy: number;
    user_level_rank: string;
    user_charged: number;
    billCoin: number;
}

const getUserInfo = async (cookies: string): Promise<UserInfo> => {
    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://live.bilibili.com/');

    const req = await fetch('https://api.live.bilibili.com/user/getuserinfo', { headers });
    const res = await req.json() as APIReturn;

    assert(res.code === 'REPONSE_OK', res.message);

    return res.data as UserInfo;
};

const doLiveDailySign = async (cookies: string): Promise<string> => {
    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://live.bilibili.com/');

    const req = await fetch('https://api.live.bilibili.com/xlive/web-ucenter/v1/sign/DoSign', { headers });
    const res = await req.json() as APIReturn;

    assert(res.code === 0 || res.code === 1011040, res.message);

    return res.message;
};

interface FansMedal {
    can_deleted: boolean;
    day_limit: number;
    guard_level: number;
    guard_medal_title: string;
    intimacy: number;
    is_lighted: number;
    level: number;
    medal_name: string;
    medal_color_border: number;
    medal_color_end: number;
    medal_color_start: number;
    medal_id: number;
    next_intimacy: number;
    today_feed: number;
    roomid: number;
    status: number;
    target_id: number;
    target_name: string;
    uname: string;
}

interface MedalList {
    count: number;
    page_info: {
        cur_page: number;
        total_page: number;
    };
    items: FansMedal[];
}

const getMedalList = async (
    cookies: string,
    page = 1,
    page_size = 10,
): Promise<MedalList> => {
    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://live.bilibili.com/');

    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('page_size', page_size.toString());

    const req = await fetch(`https://api.live.bilibili.com/xlive/app-ucenter/v1/user/GetMyMedals?${params}`, { headers });
    const res = await req.json() as APIReturn;

    assert(res.code === 0, res.message);

    return res.data as MedalList;
};

interface WearedMedal {
    uid: number;
    target_id: number;
    medal_id: number;
    score: number;
    level: number;
    intimacy: number;
    status: number;
    source: number;
    receive_channel: number;
    is_receive: number;
    master_status: number;
    receive_time: string;
    today_intimacy: number;
    last_wear_time: number;
    is_lighted: number;
    medal_level: number;
    next_intimacy: number;
    day_limit: number;
    medal_name: string;
    master_available: number;
    guard_type: number;
    lpl_status: number;
    can_delete: boolean;
    target_name: string;
    target_face: string;
    live_stream_status: number;
    icon_code: number;
    icon_text: string;
    rank: string;
    medal_color: number;
    medal_color_start: number;
    medal_color_end: number;
    guard_level: number;
    medal_color_border: number;
    today_feed: number;
    is_union: number;
    roominfo: {
        title: string;
        room_id: number;
        uid: number;
        online: number;
        live_time: number;
        live_status: number;
        short_id: number;
        area: number;
        area_name: string;
        area_v2_id: number;
        area_v2_name: string;
        area_v2_parent_name: string;
        area_v2_parent_id: number;
        uname: string;
        face: string;
        tag_name: string;
        tags: string;
        cover_from_user: string;
        keyframe: string;
        lock_till: string;
        hidden_till: string;
        broadcast_type: number;
    };
}

const getWearedMedal = async (cookies: string): Promise<WearedMedal | undefined> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://live.bilibili.com/');
    headers.set('Content-Type', 'application/x-www-form-urlencoded');

    const body = new URLSearchParams();
    body.set('csrf', csrf);
    body.set('csrf_token', csrf);

    const req = await fetch('https://api.live.bilibili.com/live_user/v1/UserInfo/get_weared_medal', { method: 'POST', headers, body });
    const res = await req.json() as APIReturn;

    assert(res.code === 0, res.message);

    if (res.data instanceof Array) {
        return undefined;
    }

    return res.data as WearedMedal;
};

const wearMedal = async (cookies: string, medalID: number): Promise<void> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://live.bilibili.com/');
    headers.set('Content-Type', 'application/x-www-form-urlencoded');

    const body = new URLSearchParams();
    body.set('medal_id', medalID.toString());
    body.set('csrf', csrf);
    body.set('csrf_token', csrf);

    const req = await fetch('https://api.live.bilibili.com/xlive/web-room/v1/fansMedal/wear', { method: 'POST', headers, body });
    const res = await req.json() as APIReturn;

    assert(res.code === 0, res.message);
};

const takeOffMedal = async (cookies: string): Promise<void> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://live.bilibili.com/');
    headers.set('Content-Type', 'application/x-www-form-urlencoded');

    const body = new URLSearchParams();
    body.set('csrf', csrf);
    body.set('csrf_token', csrf);

    const req = await fetch('https://api.live.bilibili.com/xlive/web-room/v1/fansMedal/take_off', { method: 'POST', headers, body });
    const res = await req.json() as APIReturn;

    assert(res.code === 0, res.message);
};

interface RoomInfo {
    uid: number;
    room_id: number;
    short_id: number;
    attention: number;
    online: number;
    is_portrait: boolean;
    description: string;
    live_status: number;
    area_id: number;
    parent_area_id: number;
    parent_area_name: string;
    old_area_id: number;
    background: string;
    title: string;
    user_cover: string;
    keyframe: string;
    is_strict_room: boolean;
    live_time: string;
    tags: string;
    is_anchor: number;
    room_silent_type: string;
    room_silent_level: number;
    room_silent_second: number;
    area_name: string;
    pendants: string;
    area_pendants: string;
    hot_words: string[];
    hot_words_status: number;
    verify: string;
    new_pendants: {
        frame: {
            name: string;
            value: string;
            position: number;
            desc: string;
            area: number;
            area_old: number;
            bg_color: string;
            bg_pic: string;
            use_old_area: boolean;
        };
        badge: {
            name: string;
            position: number;
            value: string;
            desc: string;
        };
        mobile_frame: {
            name: string;
            value: string;
            position: number;
            desc: string;
            area: number;
            area_old: number;
            bg_color: string;
            bg_pic: string;
            use_old_area: boolean;
        };
        mobile_badge?: unknown;
    };
    up_session: string;
    pk_status: number;
    pk_id: number;
    battle_id: number;
    allow_change_area_time: number;
    allow_upload_cover_time: number;
    studio_info: {
        status: number;
        master_list: unknown[];
    };
}

const getRoomInfo = async (cookies: string, room_id: number, from = 'room'): Promise<RoomInfo> => {
    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://live.bilibili.com/');

    const params = new URLSearchParams();
    params.set('room_id', room_id.toString());
    params.set('from', from);

    const req = await fetch(`https://api.live.bilibili.com/room/v1/Room/get_info?${params}`, { headers });
    const res = await req.json() as APIReturn;

    assert(res.code === 0, res.message);

    return res.data as RoomInfo;
};

const sendDanmu = async (cookies: string, msg: string, roomid: number, color = '16777215', fontsize = 25, mode = 1, bubble = 0): Promise<void> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://live.bilibili.com/');
    headers.set('Content-Type', 'application/x-www-form-urlencoded');

    const body = new URLSearchParams();
    body.set('msg', msg);
    body.set('roomid', roomid.toString());
    body.set('color', color);
    body.set('fontsize', fontsize.toString());
    body.set('mode', mode.toString());
    body.set('bubble', bubble.toString());
    body.set('rnd', Math.round(Date.now() / 1000).toString());
    body.set('csrf', csrf);
    body.set('csrf_token', csrf);

    const req = await fetch('https://api.live.bilibili.com/msg/send', { method: 'POST', headers, body });
    const res = await req.json() as APIReturn;

    assert(res.code === 0 && res.message.length === 0, res.message);
};

interface GiftBagList {
    list: {
        bag_id: number;
        gift_id: number;
        gift_name: string;
        gift_num: number;
        gift_type: number;
        corner_color: string;
        bind_room_text: string;
        bind_roomid: number;
        expire_at: number;
        corner_mark: string;
        count_map: {
            num: number;
            text: string;
        }[];
    }[],
    time: number,
}

const getGiftBagList = async (cookies: string): Promise<GiftBagList> => {
    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://live.bilibili.com/');

    const req = await fetch('https://api.live.bilibili.com/gift/v2/gift/bag_list', { headers });
    const res = await req.json() as APIReturn;

    assert(res.code === 0, res.message);

    return res.data as GiftBagList;
};

interface GiftInfo {
    id: number;
    name: string;
    price: number;
    type: number;
    coin_type: string;
    bag_gift: number;
    effect: number;
    corner_mark: string;
    corner_background: string;
    broadcast: number;
    draw: number;
    stay_time: number;
    animation_frame_num: number;
    desc: string;
    rule: string;
    rights: string;
    privilege_required: number;
    count_map: {
        num: number;
        text: string;
        web_svga: string;
        vertical_svga: string;
        horizontal_svga: string;
    }[];
    img_basic: string;
    img_dynamic: string;
    frame_animation: string;
    gif: string;
    webp: string;
    full_sc_web: string;
    full_sc_horizontal: string;
    full_sc_vertical: string;
    full_sc_horizontal_svga: string;
    full_sc_vertical_svga: string;
    bullet_head: string;
    bullet_tail: string;
    limit_interval: number;
    bind_ruid: number;
    bind_roomid: number;
    gift_type: number;
    combo_resources_id: number;
    max_send_limit: number;
    weight: number;
    goods_id: number;
    has_imaged_gift: number;
    left_corner_text: string;
    left_corner_background: string;
}

const getGiftConfig = async (cookies: string): Promise<GiftInfo[]> => {
    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://live.bilibili.com/');

    const req = await fetch('https://api.live.bilibili.com/gift/v3/live/gift_config', { headers });
    const res = await req.json() as APIReturn;

    assert(res.code === 0, res.message);

    return res.data as GiftInfo[];
};

interface RoomInitInfo {
    room_id: number;
    short_id: number;
    uid: number;
    need_p2p: number;
    is_hidden: boolean;
    is_locked: boolean;
    is_portrait: boolean;
    live_status: number;
    hidden_till: number;
    lock_till: number;
    encrypted: boolean;
    pwd_verified: boolean;
    live_time: number;
    room_shield: number;
    is_sp: number;
    special_type: number;
}

const doRoomInit = async (cookies: string, roomID: number): Promise<RoomInitInfo> => {
    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://live.bilibili.com/');

    const params = new URLSearchParams();
    params.set('id', roomID.toString());

    const req = await fetch(`https://api.live.bilibili.com/room/v1/Room/room_init?${params}`, { headers });
    const res = await req.json() as APIReturn;

    assert(res.code === 0, res.message);

    return res.data as RoomInitInfo;
};

const sendGiftBag = async (
    cookies: string,
    uid: number,
    gift_id: number,
    ruid: number,
    gift_num: number,
    bag_id: number,
    biz_id: number,
    rnd: number,
    platform = 'pc',
    biz_code = 'live',
    storm_beat_id = 0,
    price = 0,
) => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://www.bilibili.com/');
    headers.set('Content-Type', 'application/x-www-form-urlencoded');

    const body = new URLSearchParams();
    body.set('uid', uid.toString());
    body.set('gift_id', gift_id.toString());
    body.set('ruid', ruid.toString());
    body.set('gift_num', gift_num.toString());
    body.set('bag_id', bag_id.toString());
    body.set('biz_id', biz_id.toString()); // roomID
    body.set('rnd', rnd.toString());
    body.set('platform', platform);
    body.set('biz_code', biz_code);
    body.set('storm_beat_id', storm_beat_id.toString());
    body.set('price', price.toString());
    body.set('csrf', csrf);
    body.set('csrf_token', csrf);

    const req = await fetch('https://api.live.bilibili.com/xlive/revenue/v1/gift/sendBag', { method: 'POST', headers, body });
    const res = await req.json() as APIReturn;

    assert(res.code === 0, res.message);
};

interface EnterRoomReturn {
    timestamp: number,
    heartbeat_interval: number,
    secret_key: string,
    secret_rule: number[],
    patch_status: number,
}

const enterRoomHeartbeat = async (
    cookies: string,
    id: string,
    device: string,
    ruid: number,
    ts: number,
    is_patch: number,
    heart_beat: string,
): Promise<EnterRoomReturn> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://www.bilibili.com/');
    headers.set('Content-Type', 'application/x-www-form-urlencoded');

    const body = new URLSearchParams();
    body.set('id', id);
    body.set('device', device);
    body.set('ruid', ruid.toString());
    body.set('ts', ts.toString());
    body.set('is_patch', is_patch.toString());
    body.set('heart_beat', heart_beat);
    body.set('ua', userAgent);
    body.set('visit_id', '');
    body.set('csrf', csrf);
    body.set('csrf_token', csrf);

    const req = await fetch('https://live-trace.bilibili.com/xlive/data-interface/v1/x25Kn/E', { method: 'POST', headers, body });
    const res = await req.json() as APIReturn;

    assert(res.code === 0, res.message);

    return res.data as EnterRoomReturn;
};

interface InRoomReturn {
    timestamp: number,
    heartbeat_interval: number,
    secret_key: string,
    secret_rule: number[],
}

const inRoomHeartbeat = async (
    cookies: string,
    s: string,
    id: string,
    device: string,
    ruid: number,
    ets: number,
    benchmark: string,
    time: number,
    ts: number,
): Promise<InRoomReturn> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://www.bilibili.com/');
    headers.set('Content-Type', 'application/x-www-form-urlencoded');

    const body = new URLSearchParams();
    body.set('s', s);
    body.set('id', id);
    body.set('device', device);
    body.set('ruid', ruid.toString());
    body.set('ets', ets.toString());
    body.set('benchmark', benchmark);
    body.set('time', time.toString());
    body.set('ts', ts.toString());
    body.set('ua', userAgent);
    body.set('visit_id', '');
    body.set('csrf', csrf);
    body.set('csrf_token', csrf);

    const req = await fetch('https://live-trace.bilibili.com/xlive/data-interface/v1/x25Kn/X', { method: 'POST', headers, body });
    const res = await req.json() as APIReturn;

    assert(res.code === 0, res.message);

    return res.data as InRoomReturn;
};

const trigerInteract = async (cookies: string, roomid: number): Promise<void> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://www.bilibili.com/');
    headers.set('Content-Type', 'application/x-www-form-urlencoded');

    const body = new URLSearchParams();
    body.set('roomid', roomid.toString());
    body.set('interact_type', '3');
    body.set('csrf', csrf);
    body.set('csrf_token', csrf);

    const req = await fetch('https://api.live.bilibili.com/xlive/web-room/v1/index/TrigerInteract', { method: 'POST', headers, body });
    const res = await req.json() as APIReturn;

    assert(res.code === 0, res.message);
};

const likeInteract = async (
    cookies: string,
    roomid: number,
    uid: number,
    ts: number,
): Promise<void> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Cookie', cookies);
    headers.set('Referer', 'https://www.bilibili.com/');
    headers.set('Content-Type', 'application/x-www-form-urlencoded');

    const body = new URLSearchParams();
    body.set('roomid', roomid.toString());
    body.set('uid', uid.toString());
    body.set('ts', ts.toString());
    body.set('csrf', csrf);
    body.set('csrf_token', csrf);

    const req = await fetch('https://api.live.bilibili.com/xlive/web-ucenter/v1/interact/likeInteract', { method: 'POST', headers, body });
    const res = await req.json() as APIReturn;

    assert(res.code === 0, res.message);
};

export {
    getNavInfo,
    getPrivilege,
    receivePrivilege,
    getUserCoupon,
    createOrder,
    getUserInfo,
    doLiveDailySign,
    getMedalList,
    getWearedMedal,
    wearMedal,
    takeOffMedal,
    getRoomInfo,
    sendDanmu,
    getGiftBagList,
    getGiftConfig,
    doRoomInit,
    sendGiftBag,
    enterRoomHeartbeat,
    inRoomHeartbeat,
    trigerInteract,
    likeInteract,
};

export type {
    FansMedal,
    MedalList,
};
