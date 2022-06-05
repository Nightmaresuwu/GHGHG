import { AMQPChannel, AMQPClient, AMQPConsumer, AMQPMessage, AMQPProperties } from "@cloudamqp/amqp-client";
import * as Sentry from "@sentry/node";
import Emittery from "emittery";
import { randomUUID } from "node:crypto";
import { create_functional_timeout } from "./functions";

function encode(data: any): Buffer {
    return Buffer.from(JSON.stringify(data));
}

function decode(buffer: Buffer): any {
    return JSON.parse(buffer.toString());
}

function create_message(channel: AMQPChannel, msg: AMQPMessage): Message {
    return {
        channel,
        msg,
        body: decode(Buffer.from(msg.body!!)),
        ack: () => channel.basicAck(msg.deliveryTag),
        nack: ({ requeue = false, aut = false } = {}) => channel.basicNack(msg.deliveryTag, aut, requeue),
        reject: (requeue = false) => channel.basicReject(msg.deliveryTag, requeue),
        reply: (data) =>
            channel.basicPublish("", msg.properties.replyTo, encode(data), {
                correlationId: msg.properties.correlationId,
            }),
    };
}

export async function create_amqp_connection(host?: string): Promise<AmqpObject> {
    /* connect to amqp. */
    const client = new AMQPClient(host ?? "amqp://127.0.0.1");
    await client.connect();

    return { client, channel: await client.channel() };
}

export async function create_rpc_client(channel: AMQPChannel, exchange: string): Promise<RpcClient> {
    const emitter = new Emittery();

    /* create callback consumer. */
    const { name: callbackQueue } = await channel.queueDeclare();
    await consume(channel, callbackQueue, delivery => {
        const correlationId = delivery.msg.properties.correlationId;
        if (!correlationId) {
            console.info("[amqp rpc] received message without correlation id");
            return;
        }

        emitter.emit(correlationId, delivery);
    });

    /* create client */
    return {
        call: async (routingKey, data) => {
            const transaction = Sentry.startTransaction({
                op: "rpc_call",
                name: data.type ? `rpc:${data.type}` : routingKey,
                data,
            });

            try {
                return await new Promise(async (resolve, reject) => {
                    try {
                        const correlationId = randomUUID();
                        await publish(channel, exchange, routingKey, data, {
                            correlationId,
                            replyTo: callbackQueue,
                        });

                        const timeout = create_functional_timeout();
                        function listener(message: Message) {
                            timeout.stop();
                            resolve(message);
                        }

                        emitter.on(correlationId, listener);
                        timeout.start(15_000, () => {
                            emitter.off(correlationId, listener);
                            reject("Timedout waiting for response.");
                        });
                    } catch (e) {
                        reject(e);
                    }
                });
            } catch (e) {
                Sentry.captureException(e);
                throw e;
            } finally {
                transaction.finish();
            }
        },
    };
}

export async function consume<T = any>(
    channel: AMQPChannel,
    queue: string,
    fn: (msg: Message<T>) => void,
): Promise<AMQPConsumer> {
    return channel.basicConsume(queue, {}, msg => {
        if (!msg.body) { return; }
        fn(create_message(channel, msg));
    });
}

export async function publish(
    channel: AMQPChannel,
    exchange: string,
    routingKey: string,
    data: any,
    props: AMQPProperties = {},
) {
    return channel.basicPublish(exchange, routingKey, encode(data), {
        contentType: "application/json",
        ...props,
    });
}

interface Message<T = any> {
    msg: AMQPMessage;
    channel: AMQPChannel;
    body: T;

    reject: () => void;
    ack: () => void;
    nack: (options?: { requeue?: boolean; aut?: boolean }) => void;
    reply: (data: any) => void;
}

interface AmqpObject {
    client: AMQPClient;
    channel: AMQPChannel;
}

export interface RpcClient {
    call: <T>(routingKey: string, data: any) => Promise<Message<T>>;
}
