/* eslint-disable camelcase */

import assert from 'assert';
import got from 'got';

const UserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36';

const extractCSRF = (cookies: string): string | undefined => {
    const target = cookies.split(';').filter((value) => /^\s*bili_jct=/.test(value));
    return target.length > 0 ? target[0].replace(/^\s*bili_jct=(.*)\s*/, '$1') : undefined;
};

interface APIReturn {
    code: number | string;
    message: string;
    data: unknown;
}

export const reportVideoClick = async (cookies: string): Promise<void> => {
    const result: APIReturn = await got.get('https://api.bilibili.com/x/report/click/now', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://www.bilibili.com/',
        },
    }).json();

    assert(result.code === 0, result.message);
};

export const reportVideoHeartbeat = async (
    cookies: string, aid: number, cid: number, mid: number, start_ts: number,
    played_time = 0, realtime = 0, type = 3, play_type = 1, dt = 2,
): Promise<void> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const result: APIReturn = await got.post('https://api.bilibili.com/x/report/web/heartbeat', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://www.bilibili.com/',
        },
        form: {
            aid: aid,
            cid: cid,
            mid: mid, // uid
            start_ts: start_ts,
            played_time: played_time,
            realtime: realtime,
            type: type,
            play_type: play_type, // 1: starting, 2: playing
            dt: dt,

            csrf: csrf,
            csrf_token: csrf,
        },
    }).json();

    assert(result.code === 0, result.message);
};

export const reportShare = async (cookies: string, aid: number): Promise<string> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const result: APIReturn = await got.post('https://api.bilibili.com/x/web-interface/share/add', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://www.bilibili.com/',
        },
        form: {
            aid: aid,
            jsonp: 'jsonp',

            csrf: csrf,
            csrf_token: csrf,
        },
    }).json();

    assert(result.code === 0 || result.code === 71000, result.message);

    return result.message;
};

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

export const getNavInfo = async (cookies: string): Promise<NavInfo> => {
    const result: APIReturn = await got.get('https://api.bilibili.com/x/web-interface/nav', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://www.bilibili.com/',
        },
    }).json();

    assert(result.code === 0, result.message);

    return result.data as NavInfo;
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

export const getPrivilege = async (cookies: string): Promise<PrivilegeData> => {
    const result: APIReturn = await got.get('https://api.bilibili.com/x/vip/privilege/my', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://www.bilibili.com/',
        },
    }).json();

    assert(result.code === 0, result.message);

    return result.data as PrivilegeData;
};

export const receivePrivilege = async (cookies: string, type: number): Promise<void> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const result: APIReturn = await got.post('https://api.bilibili.com/x/vip/privilege/receive', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://www.bilibili.com/',
        },
        form: {
            type: type,

            csrf: csrf,
            csrf_token: csrf,
        },
    }).json();

    assert(result.code === 0, result.message);
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

export const getUserInfo = async (cookies: string): Promise<UserInfo> => {
    const result: APIReturn = await got.get('https://api.live.bilibili.com/user/getuserinfo', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://live.bilibili.com/',
        },
    }).json();

    assert(result.code === 'REPONSE_OK', result.message);

    return result.data as UserInfo;
};

interface DynamicData {
    new_num: number;
    exist_gap: number;
    update_num: number;
    open_rcmd: number;
    cards: {
        desc: {
            uid: number;
            type: number;
            rid: number;
            acl: number;
            view: number;
            repost: number;
            like: number;
            is_liked: number;
            dynamic_id: unknown;
            timestamp: number;
            pre_dy_id: number;
            orig_dy_id: number;
            orig_type: number;
            user_profile: {
                info: {
                    uid: number;
                    uname: string;
                    face: string;
                    face_nft: number;
                };
                card: {
                    official_verify: {
                        type: number;
                        desc: string;
                    };
                };
                vip: {
                    vipType: number;
                    vipDueDate: unknown;
                    vipStatus: number;
                    themeType: number;
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
                pendant: {
                    pid: number;
                    name: string;
                    image: string;
                    expire: number;
                    image_enhance: string;
                    image_enhance_frame: string;
                };
                rank: string;
                sign: string;
                level_info: {
                    current_level: number;
                };
                decorate_card: {
                    mid: number;
                    id: number;
                    card_url: string;
                    card_type: number;
                    name: string;
                    expire_time: number;
                    card_type_name: string;
                    uid: number;
                    item_id: number;
                    item_type: number;
                    big_card_url: string;
                    jump_url: string;
                    fan: {
                        is_fan: number;
                        number: number;
                        color: string;
                        num_desc: string;
                    };
                    image_enhance: string;
                };
            };
            uid_type: number;
            stype: number;
            r_type: number;
            inner_id: number;
            status: number;
            dynamic_id_str: string;
            pre_dy_id_str: string;
            orig_dy_id_str: string;
            rid_str: string;
            bvid: string;
        };
        card: string;
        extend_json: string;
        display: {
            topic_info: {
                topic_details: {
                    topic_id: number;
                    topic_name: string;
                    is_activity: number;
                    topic_link: string;
                }[];
                new_topic: {
                    id: number;
                    name: string;
                    link: string;
                };
            };
            usr_action_txt: string;
            relation: {
                status: number;
                is_follow: number;
                is_followed: number;
            };
            comment_info: {
                comments: {
                    uid: number;
                    name: string;
                    content: string;
                }[];
                comment_ids: string;
                emojis: {
                    emoji_name: string;
                    url: string;
                    meta: {
                        size: number;
                    };
                }[];
            };
            show_tip: {
                del_tip: string;
            };
            cover_play_icon_url: string;
            biz_info: {
                archive: {
                    season_info: {
                        text: string;
                        color: string;
                        font: string;
                        season_id: number;
                    };
                };
            };
            tags: {
                tag_type: number;
                sub_type: number;
                icon: string;
                text: string;
                link: string;
                sub_module: string;
            }[];
            like_info: {
                display_text: string;
                like_users: {
                    uid: number;
                    uname: string;
                }[];
            };
        };
        activity_infos: {
            details: {
                type: number;
                detail: string;
            }[];
        };
    }[];
    attentions: {
        uids: number[];
        bangumis: {
            season_id: number;
            type: number;
        }[];
    };
    max_dynamic_id: number;
    history_offset: number;
    _gt_: number;
}

export interface DynamicCard {
    aid: number;
    attribute: number;
    cid: number;
    copyright: number;
    ctime: number;
    desc: string;
    dimension: {
        height: number;
        rotate: number;
        width: number;
    };
    duration: number;
    dynamic: string;
    first_frame: string;
    jump_url: string;
    owner: {
        face: string;
        mid: number;
        name: string;
    };
    pic: string;
    player_info?: unknown;
    pubdate: number;
    rights: {
        autoplay: number;
        bp: number;
        download: number;
        elec: number;
        hd5: number;
        is_cooperation: number;
        movie: number;
        no_background: number;
        no_reprint: number;
        pay: number;
        ugc_pay: number;
        ugc_pay_preview: number;
    };
    short_link: string;
    short_link_v2: string;
    stat: {
        aid: number;
        coin: number;
        danmaku: number;
        dislike: number;
        favorite: number;
        his_rank: number;
        like: number;
        now_rank: number;
        reply: number;
        share: number;
        view: number;
    };
    state: number;
    tid: number;
    title: string;
    tname: string;
    videos: number;
}

export const getNewDynamic = async (
    cookies: string, uid: number, type = 8,
): Promise<DynamicData> => {
    const result: APIReturn = await got.get('https://api.live.bilibili.com/dynamic_svr/v1/dynamic_svr/dynamic_new', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://live.bilibili.com/',
        },
        searchParams: {
            uid: uid,
            type: type,
        },
    }).json();

    assert(result.code === 0, result.message);

    return result.data as DynamicData;
};

export const doLiveDailySign = async (cookies: string): Promise<string> => {
    const result: APIReturn = await got.get('https://api.live.bilibili.com/xlive/web-ucenter/v1/sign/DoSign', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://live.bilibili.com/',
        },
    }).json();

    assert(result.code === 0 || result.code === 1011040, result.message);

    return result.message;
};

export interface FansMedal {
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

export interface MedalList {
    count: number;
    page_info: {
        cur_page: number;
        total_page: number;
    };
    items: FansMedal[];
}

export const getMedalList = async (
    cookies: string, page = 1, page_size = 10,
): Promise<MedalList> => {
    const result: APIReturn = await got.get('https://api.live.bilibili.com/xlive/app-ucenter/v1/user/GetMyMedals', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://live.bilibili.com/',
        },
        searchParams: {
            page: page,
            page_size: page_size,
        },
    }).json();

    assert(result.code === 0, result.message);

    return result.data as MedalList;
};

interface GroupInfo {
    list: {
        group_id: number;
        owner_uid: number;
        group_type: number;
        group_level: number;
        group_cover: string;
        group_name: string;
        group_notice: string;
        group_status: number;
        room_id: number;
        is_living: number;
        fans_medal_name: string;
    }[];
}

export const getGroupList = async (cookies: string): Promise<GroupInfo> => {
    const result: APIReturn = await got.get('https://api.live.bilibili.com/link_group/v1/member/my_groups', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://live.bilibili.com/',
        },
    }).json();

    assert(result.code === 0, result.message);

    return result.data as GroupInfo;
};

interface GroupSignInfo {
    add_num: number;
    status: number;
    _gt_: number;
}

export const doGroupSign = async (
    cookies: string, group_id: number, owner_id: number,
): Promise<GroupSignInfo> => {
    const result: APIReturn = await got.get('https://api.live.bilibili.com/link_setting/v1/link_setting/sign_in', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://live.bilibili.com/',
        },
        searchParams: {
            group_id: group_id,
            owner_id: owner_id,
        },
    }).json();

    assert(result.code === 0, result.message);

    return result.data as GroupSignInfo;
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

export const getWearedMedal = async (cookies: string): Promise<WearedMedal | undefined> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const result: APIReturn = await got.post('https://api.live.bilibili.com/live_user/v1/UserInfo/get_weared_medal', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://live.bilibili.com/',
        },
        form: {
            csrf: csrf,
            csrf_token: csrf,
        },
    }).json();

    assert(result.code === 0, result.message);

    if (result.data instanceof Array) {
        return;
    }

    return result.data as WearedMedal;
};

export const wearMedal = async (cookies: string, medalID: number): Promise<void> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const result: APIReturn = await got.post('https://api.live.bilibili.com/xlive/web-room/v1/fansMedal/wear', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://live.bilibili.com/',
        },
        form: {
            medal_id: medalID,

            csrf: csrf,
            csrf_token: csrf,
        },
    }).json();

    assert(result.code === 0, result.message);
};

export const takeOffMedal = async (cookies: string): Promise<void> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const result: APIReturn = await got.post('https://api.live.bilibili.com/xlive/web-room/v1/fansMedal/take_off', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://live.bilibili.com/',
        },
        form: {
            csrf: csrf,
            csrf_token: csrf,
        },
    }).json();

    assert(result.code === 0, result.message);
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

export const getRoomInfo = async (
    cookies: string, room_id: number, from = 'room',
): Promise<RoomInfo> => {
    const result: APIReturn = await got.get('https://api.live.bilibili.com/room/v1/Room/get_info', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://live.bilibili.com/',
        },
        searchParams: {
            room_id: room_id,
            from: from,
        },
    }).json();

    assert(result.code === 0, result.message);

    return result.data as RoomInfo;
};

export const sendDanmu = async (
    cookies: string, msg: string, roomid: number, color = '16777215', fontsize = 25, mode = 1, bubble = 0,
): Promise<void> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const result: APIReturn = await got.post('https://api.live.bilibili.com/msg/send', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://live.bilibili.com/',
        },
        form: {
            msg: msg,
            roomid: roomid,
            color: color,
            fontsize: fontsize,
            mode: mode,
            bubble: bubble,
            rnd: Math.round(Date.now() / 1000),

            csrf: csrf,
            csrf_token: csrf,
        },
    }).json();

    assert(result.code === 0 && result.message.length === 0, result.message);
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

export const getGiftBagList = async (cookies: string): Promise<GiftBagList> => {
    const result: APIReturn = await got.get('https://api.live.bilibili.com/gift/v2/gift/bag_list', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://live.bilibili.com/',
        },
    }).json();

    assert(result.code === 0, result.message);

    return result.data as GiftBagList;
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

export const getGiftConfig = async (cookies: string): Promise<GiftInfo[]> => {
    const result: APIReturn = await got.get('https://api.live.bilibili.com/gift/v3/live/gift_config', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://live.bilibili.com/',
        },
    }).json();

    assert(result.code === 0, result.message);

    return result.data as GiftInfo[];
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

export const doRoomInit = async (cookies: string, roomID: number): Promise<RoomInitInfo> => {
    const result: APIReturn = await got.get('https://api.live.bilibili.com/room/v1/Room/room_init', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://live.bilibili.com/',
        },
        searchParams: {
            id: roomID,
        },
    }).json();

    assert(result.code === 0, result.message);

    return result.data as RoomInitInfo;
};

export const sendGiftBag = async (
    cookies: string, uid: number, gift_id: number, ruid: number,
    gift_num: number, bag_id: number, biz_id: number, rnd: number,
    platform = 'pc', biz_code = 'live', storm_beat_id = 0, price = 0,
) => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const result: APIReturn = await got.post('https://api.live.bilibili.com/xlive/revenue/v1/gift/sendBag', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://www.bilibili.com/',
        },
        form: {
            uid: uid,
            gift_id: gift_id,
            ruid: ruid,
            gift_num: gift_num,
            bag_id: bag_id,
            biz_id: biz_id, // roomID
            rnd: rnd,
            platform: platform,
            biz_code: biz_code,
            storm_beat_id: storm_beat_id,
            price: price,

            csrf: csrf,
            csrf_token: csrf,
        },
    }).json();

    assert(result.code === 0, result.message);
};

interface EnterRoomReturn {
    timestamp: number,
    heartbeat_interval: number,
    secret_key: string,
    secret_rule: number[],
    patch_status: number,
}

export const enterRoomHeartbeat = async (
    cookies: string, id: string, device: string, ruid: number,
    ts: number, is_patch: number, heart_beat: string,
): Promise<EnterRoomReturn> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const result: APIReturn = await got.post('https://live-trace.bilibili.com/xlive/data-interface/v1/x25Kn/E', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://www.bilibili.com/',
        },
        form: {
            id: id,
            device: device,
            ruid: ruid,
            ts: ts,
            is_patch: is_patch,
            heart_beat: heart_beat,

            ua: UserAgent,
            visit_id: '',

            csrf: csrf,
            csrf_token: csrf,
        },
    }).json();

    assert(result.code === 0, result.message);

    return result.data as EnterRoomReturn;
};

interface InRoomReturn {
    timestamp: number,
    heartbeat_interval: number,
    secret_key: string,
    secret_rule: number[],
}

export const inRoomHeartbeat = async (
    cookies: string, s: string, id: string, device: string, ruid: number,
    ets: number, benchmark: string, time: number, ts: number,
): Promise<InRoomReturn> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const result: APIReturn = await got.post('https://live-trace.bilibili.com/xlive/data-interface/v1/x25Kn/X', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://www.bilibili.com/',
        },
        form: {
            s: s,
            id: id,
            device: device,
            ruid: ruid,
            ets: ets,
            benchmark: benchmark,
            time: time,
            ts: ts,

            ua: UserAgent,
            visit_id: '',

            csrf: csrf,
            csrf_token: csrf,
        },
    }).json();

    assert(result.code === 0, result.message);

    return result.data as InRoomReturn;
};

export const trigerInteract = async (
    cookies: string, roomid: number,
): Promise<void> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const result: APIReturn = await got.post('https://api.live.bilibili.com/xlive/web-room/v1/index/TrigerInteract', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://www.bilibili.com/',
        },
        form: {
            roomid: roomid,
            interact_type: 3,

            csrf: csrf,
            csrf_token: csrf,
        },
    }).json();

    assert(result.code === 0, result.message);
};

export const likeInteract = async (
    cookies: string, roomid: number, uid: number, ts: number,
): Promise<void> => {
    const csrf = extractCSRF(cookies);

    assert(csrf !== undefined, '获取CSRF值失败');

    const result: APIReturn = await got.post('https://api.live.bilibili.com/xlive/web-ucenter/v1/interact/likeInteract', {
        headers: {
            'User-Agent': UserAgent,
            'Cookie': cookies,
            'Referer': 'https://www.bilibili.com/',
        },
        form: {
            roomid: roomid,
            uid: uid,
            ts: ts,

            csrf: csrf,
            csrf_token: csrf,
        },
    }).json();

    assert(result.code === 0, result.message);
};
