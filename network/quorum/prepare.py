'''
A handy script to prepare a network setup file in json format.
The json file will be consumed by caliper to connect to Quorum:
Format of json:
{"quorum": 
    "network": [
        {"url": <http_node_endpoint>, "pub_key": <node_pub_key>},
        {"url": <http_node_endpoint>, "pub_key": <node_pub_key>},
        {"url": <http_node_endpoint>, "pub_key": <node_pub_key>}
        ...
    ], 
    "private": 0/1
]
'''

import sys
import os
import json

PORT='8000' # Quorom's RPC port

def absPath(rel_path):
    goal_dir = os.path.join(os.getcwd(), rel_path)
    return os.path.abspath(goal_dir)

def main():
    if len(sys.argv) < 4:
        print 'usage <# of nodes> <path/to/host/file> <path/to/key/dir> <path/to/setup.json> [-p]'
        return
    node_count = int(sys.argv[1])
    host_path = absPath(sys.argv[2])
    key_dir = absPath(sys.argv[3])
    setup_path = absPath(sys.argv[4])

    if len(sys.argv) == 6 and sys.argv[5] == '-p':
        private = 1;
    else:
        private = 0;

    setup_json = {'quorum': {'network': [], 'private': private}}
    with open(host_path) as f:
        hosts = f.readlines()
    

    for i in range(1, 1+node_count):
        element = {}
        key_path = os.path.join(key_dir, "tm{}.pub".format(i))
        with open(key_path) as f:
            pub_key = f.readline().strip()
            element['url'] = "http://" + hosts[i-1].strip() + ":" + PORT
            element['pub_key'] = pub_key
        setup_json['quorum']['network'].append(element)
    
    with open(setup_path, 'w+') as f:
        json.dump(setup_json, f, indent=2)
    
    print "Finish preparing the network setup file..."
    

if __name__ == "__main__":
    main()
        
        
    




    

