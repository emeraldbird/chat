import asyncio
import datetime
import uuid

from fastapi import FastAPI, WebSocket
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.requests import Request

import uvicorn


app = FastAPI()
app.mount('/static', StaticFiles(directory='./static'), name='static')

templates = Jinja2Templates(directory='./templates')

RECIPIENTS = {}


@app.get('/')
async def root(request: Request):
    return templates.TemplateResponse('index.html', {'request': request})


def fake_id():
    id_ = 0
    while True:
        yield (id_ := id_ + 1)


def fake_name():
    # Got here https://myanimelist.net/featured/1529/Top_20_Popular_Anime_Names_for_Boys_and_Girls_on_MAL
    names = ["Akira", "Haruka", "Makoto",
             "Sakura", "Yuki", "Aoi", "Yuu",
             "Kaoru", "Jun", "Ai",
             "Akane", "Rin", "Kei", "Takashi",
             "Aya", "Megumi", "Hiroshi",
             "Maria", "Yuri", "Saki"]

    while True:
        for name in names:
            yield name


ID_GENERATOR = fake_id()
NAME_GENERATOR = fake_name()


async def announce_users(chat_id: str):
    """ send contacts list to all users in the chat <chat_id> """
    if RECIPIENTS[chat_id]:

        data = {
            "type": "contacts",
            "contacts": [{"id": id, "username": dict_['nickname']} for id, dict_ in RECIPIENTS[chat_id].items()],
        }

        for recipient in RECIPIENTS[chat_id].values():
            await recipient['ws'].send_json(data)


@app.websocket("/ws/{id}")
async def websocket_endpoint(id: str, websocket: WebSocket):
    await websocket.accept()
    my_id = next(ID_GENERATOR)
    my_name = next(NAME_GENERATOR)


    if id == "create-new":
        id = str(uuid.uuid4())
        RECIPIENTS[id] = {}


    if id not in RECIPIENTS:
        websocket.close()
        return

    RECIPIENTS[id][my_id] = {"ws": websocket, "nickname": my_name}

    await asyncio.sleep(0.1)

    await websocket.send_json(
        {
            "type": "settings",
            "id": my_id,
            "username": my_name,
            "chat_id": id,
        }
    )

    await RECIPIENTS[id][my_id]['ws'].send_json(
        {
            "type": "message",
            'from': my_id,
            'text': "This is your chat",
        }
    )

    await announce_users(chat_id=id)

    while True:

        try:
            json_data = await websocket.receive_json()
            recipient_id = int(json_data.get('recipient_id'))

            text = json_data.get('text', '')

            message = {
                'type': "message",
                'from': my_id,
                'nickname': RECIPIENTS[id][my_id]['nickname'],
                'text': text,
                'time': datetime.datetime.now().strftime('%c'),
            }

            # if id == -1 send message to all users (common chat)
            # else send message only for the recipient
            if recipient_id == -1:
                message['common'] = True

                for id_, recipient in RECIPIENTS[id].items():
                    if id_ == my_id:
                        continue
                    await recipient['ws'].send_json(message)

            elif recipient_ws := RECIPIENTS[id].get(recipient_id):
                await RECIPIENTS[id][recipient_id]['ws'].send_json(message)

        except Exception as error:
            print(error)

            # Close websocket if exception
            try:
                await RECIPIENTS[id][my_id].close()
            except Exception as sub_error:
                print(sub_error)

            # Delete from dictionary with recipients
            del(RECIPIENTS[id][my_id])
            print(my_id, 'deleted from RECIPIENTS')
            await announce_users(chat_id=id)
            break


if __name__ == '__main__':
    uvicorn.run(app=app, port=8000)
