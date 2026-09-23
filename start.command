#!/bin/bash
cd "$(dirname "$0")"
echo "noon Wishlist page → http://localhost:4323"
echo "Leave this window open while you work. Close it to stop."
( sleep 1 && open "http://localhost:4323/index.html" ) &
python3 -m http.server 4323
