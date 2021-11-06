/// <reference types="@fibjs/types" />
import * as ssl from "ssl";
ssl.loadRootCerts();
import {RPCClient} from "./RPCClient";
import {ROAClient} from "./ROAClient";
import {OSSObject} from "./OSSClient";
import {STS} from "./STS";
export{
    RPCClient,
    ROAClient,
    OSSObject,
    STS
}





